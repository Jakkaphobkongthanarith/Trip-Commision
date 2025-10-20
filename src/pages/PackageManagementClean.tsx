import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { packageAPI, bookingAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Edit,
  Trash2,
  Plus,
  X,
  Check,
  ChevronsUpDown,
  Search,
  Users,
  Calendar,
  Percent,
} from "lucide-react";

interface Package {
  id: string;
  title: string;
  location: string;
  price: number;
  duration: number;
  description: string;
  image_url: string;
  advertisers: User[];
  tags: string[] | string | null;
  available_from: string | null;
  available_to: string | null;
  max_guests: number;
  discount_percentage: number;
}

interface Booking {
  id: string;
  customer_id: string;
  booking_date: string;
  special_requests: string | null;
  guest_count: number;
  status: string;
  profiles: {
    display_name: string;
    phone: string;
    email: string;
  };
}

interface User {
  id: string;
  display_name: string;
  email: string;
}

interface GlobalDiscountCode {
  id: string;
  code: string;
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
}

interface CreateGlobalDiscountForm {
  discount_percentage: number;
  max_uses?: number;
  expires_at?: string;
}

export default function PackageManagement() {
  const { user } = useAuth();
  const { userRole, loading } = useUserRole();
  const { toast } = useToast();

  // Package states
  const [packages, setPackages] = useState<Package[]>([]);
  const [advertisers, setAdvertisers] = useState<User[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bookingsDialogOpen, setBookingsDialogOpen] = useState(false);
  const [selectedPackageBookings, setSelectedPackageBookings] = useState<
    Booking[]
  >([]);
  const [selectedPackageTitle, setSelectedPackageTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Global Discount states only
  const [globalCodes, setGlobalCodes] = useState<GlobalDiscountCode[]>([]);
  const [isGlobalDiscountDialogOpen, setIsGlobalDiscountDialogOpen] =
    useState(false);
  const [activeTab, setActiveTab] = useState<"packages" | "global-discounts">(
    "packages"
  );
  const [globalDiscountForm, setGlobalDiscountForm] =
    useState<CreateGlobalDiscountForm>({
      discount_percentage: 10,
      max_uses: undefined,
      expires_at: "",
    });
  const [isDiscountSubmitting, setIsDiscountSubmitting] = useState(false);

  // Package form state
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    price: "",
    duration: "",
    description: "",
    image_url: "",
    advertiser_ids: [] as string[],
    tags: [] as string[],
    available_from: "",
    available_to: "",
    max_guests: "10",
    discount_percentage: "0",
  });
  const [newTag, setNewTag] = useState("");
  const [tagComboOpen, setTagComboOpen] = useState(false);

  // Image upload states
  const [isDragOver, setIsDragOver] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Advertiser selection modal states
  const [isAdvertiserModalOpen, setIsAdvertiserModalOpen] = useState(false);

  useEffect(() => {
    if (userRole === "manager") {
      fetchPackages();
      fetchAdvertisers();
      fetchExistingTags();
      fetchGlobalDiscountCodes();
    }
  }, [userRole]);

  // Auto-calculate duration from date range
  useEffect(() => {
    if (formData.available_from && formData.available_to) {
      const startDate = new Date(formData.available_from);
      const endDate = new Date(formData.available_to);

      if (endDate > startDate) {
        const timeDiff = endDate.getTime() - startDate.getTime();
        const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        setFormData((prev) => ({
          ...prev,
          duration: dayDiff.toString(),
        }));
      } else if (endDate.getTime() === startDate.getTime()) {
        // Same day = 1 day trip
        setFormData((prev) => ({
          ...prev,
          duration: "1",
        }));
      }
    } else {
      // Reset duration if dates are cleared
      setFormData((prev) => ({
        ...prev,
        duration: "",
      }));
    }
  }, [formData.available_from, formData.available_to]);

  // Early return หลังจาก useState ทั้งหมด
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== "manager") {
    return <Navigate to="/" replace />;
  }

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const normalizeTags = (tags: string[] | string | null): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === "string") {
      const cleanedTags = tags.replace(/[{}]/g, "");
      return cleanedTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
    }
    return [];
  };

  const fetchPackages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/travel-packages`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const packagesWithAdvertisers = (data || []).map((pkg: any) => ({
        ...pkg,
        tags: normalizeTags(pkg.tags),
        advertisers:
          pkg.advertisers && pkg.advertisers.length > 0
            ? pkg.advertisers
            : pkg.advertiser
            ? [pkg.advertiser]
            : [],
      }));
      setPackages(packagesWithAdvertisers);
    } catch (error) {
      console.error("Error fetching packages:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลแพคเกจได้",
        variant: "destructive",
      });
    }
  };

  const fetchAdvertisers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/manager/advertisers`);
      if (!response.ok) throw new Error("Failed to fetch advertisers");
      const data = await response.json();
      setAdvertisers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching advertisers:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลผู้โฆษณาได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExistingTags = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/packages/tags`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch tags");
      const data = await response.json();
      if (Array.isArray(data)) {
        setExistingTags(data.sort());
      } else {
        setExistingTags([]);
      }
    } catch (error) {
      console.error("Error fetching existing tags:", error);
      setExistingTags([]);
    }
  };

  const fetchGlobalDiscountCodes = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/manager/global-discount-codes`
      );
      if (!response.ok)
        throw new Error("Failed to fetch global discount codes");
      const data = await response.json();
      setGlobalCodes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching global discount codes:", error);
      setGlobalCodes([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate duration
    if (!formData.duration || parseInt(formData.duration) <= 0) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "กรุณาเลือกวันที่เริ่มและสิ้นสุดให้ถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const packageData = {
        title: formData.title,
        location: formData.location,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration),
        description: formData.description,
        image_url: formData.image_url,
        tags: Array.isArray(formData.tags)
          ? `{${formData.tags.join(",")}}`
          : formData.tags,
        available_from: formData.available_from || null,
        available_to: formData.available_to || null,
        max_guests: parseInt(formData.max_guests),
        discount_percentage: parseFloat(formData.discount_percentage),
        advertiser_ids: formData.advertiser_ids || [],
      };

      if (editingPackage) {
        const response = await fetch(
          `${API_BASE_URL}/api/packages/${editingPackage.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(packageData),
          }
        );

        if (!response.ok) throw new Error("Failed to update package");

        await updatePackageAdvertisers(
          editingPackage.id,
          formData.advertiser_ids,
          editingPackage.advertisers?.map((a) => a.id) || []
        );

        toast({
          title: "สำเร็จ",
          description: "อัปเดตแพคเกจเรียบร้อยแล้ว",
        });
      } else {
        const response = await fetch(`${API_BASE_URL}/api/packages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(packageData),
        });

        if (!response.ok) throw new Error("Failed to create package");

        const newPackage = await response.json();

        if (newPackage && formData.advertiser_ids.length > 0) {
          await updatePackageAdvertisers(
            newPackage.id,
            formData.advertiser_ids,
            []
          );
        }

        toast({
          title: "สำเร็จ",
          description: "สร้างแพคเกจใหม่เรียบร้อยแล้ว",
        });
      }

      fetchPackages();
      fetchExistingTags();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePackageAdvertisers = async (
    packageId: string,
    newAdvertiserIds: string[],
    oldAdvertiserIds: string[] = []
  ) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/package/${packageId}/advertisers`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ advertiser_ids: newAdvertiserIds }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update package advertisers");
      }

      const newlyAssignedAdvertisers = newAdvertiserIds.filter(
        (id) => !oldAdvertiserIds.includes(id)
      );

      if (newlyAssignedAdvertisers.length > 0) {
        await notifyAssignedAdvertisers(packageId, newlyAssignedAdvertisers);
      }
    } catch (error) {
      console.error("Error updating package advertisers:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตข้อมูลผู้โฆษณาได้",
        variant: "destructive",
      });
    }
  };

  const notifyAssignedAdvertisers = async (
    packageId: string,
    advertiserIds: string[]
  ) => {
    try {
      const packageDetails = packages.find((pkg) => pkg.id === packageId);
      const packageName = packageDetails?.title || `Package ID: ${packageId}`;

      for (const advertiserId of advertiserIds) {
        try {
          await sendNotificationToAdvertiser(
            advertiserId,
            `🎯 คุณได้รับมอบหมายให้โฆษณาแพ็กเกจ "${packageName}" แล้ว! เริ่มสร้างโค้ดส่วนลดและโปรโมทได้เลย`,
            "package_assignment",
            packageId
          );
        } catch (error) {
          console.error(
            `❌ Failed to notify advertiser ${advertiserId}:`,
            error
          );
        }
      }

      window.dispatchEvent(new CustomEvent("notificationCreated"));
    } catch (error) {
      console.error("❌ Error in notifyAssignedAdvertisers:", error);
    }
  };

  const sendNotificationToAdvertiser = async (
    advertiserId: string,
    message: string,
    type: string = "discount_code",
    packageId?: string
  ) => {
    try {
      const notificationData = {
        user_id: advertiserId,
        title:
          type === "package_assignment"
            ? "มอบหมายแพ็กเกจใหม่!"
            : "โค้ดส่วนลดใหม่!",
        message: message,
        type: type,
        category: type === "package_assignment" ? "booking" : "promotion",
        priority: "medium",
        ...(packageId && {
          action_url: `/package/${packageId}`,
          data: { package_id: packageId },
        }),
      };

      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
      });

      if (!response.ok) {
        throw new Error(`Notification failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Error sending notification:", error);
      throw error;
    }
  };

  const sendNotificationToAllUsers = async (message: string) => {
    try {
      if (!user?.id) return;

      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user,
          title: "โค้ดส่วนลดใหม่!",
          message: message,
          type: "global_discount",
          category: "promotion",
          priority: "medium",
        }),
      });

      if (!response.ok) {
        throw new Error(`Notification failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Error sending notification:", error);
      throw error;
    }
  };

  const handleCreateGlobalDiscountCode = async () => {
    if (globalDiscountForm.discount_percentage <= 0) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "กรุณากรอกส่วนลดให้ถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    setIsDiscountSubmitting(true);
    try {
      const requestData = {
        discount_percentage: globalDiscountForm.discount_percentage,
        max_uses: globalDiscountForm.max_uses,
        ...(globalDiscountForm.expires_at &&
          globalDiscountForm.expires_at.trim() !== "" && {
            expires_at: new Date(globalDiscountForm.expires_at).toISOString(),
          }),
      };

      const response = await fetch(
        `${API_BASE_URL}/api/global-discount-codes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create global discount code");
      }

      const responseData = await response.json();

      let discountCode = "ตรวจสอบในระบบ";
      if (responseData.code) {
        if (typeof responseData.code === "string") {
          discountCode = responseData.code;
        } else if (responseData.code.code) {
          discountCode = responseData.code.code;
        }
      }

      try {
        const notificationMessage = `🎉 โค้ดส่วนลดใหม่! ลด ${globalDiscountForm.discount_percentage}% สำหรับทุกแพ็กเกจ โค้ด: ${discountCode}`;
        await sendNotificationToAllUsers(notificationMessage);
        window.dispatchEvent(new CustomEvent("notificationCreated"));
      } catch (notificationError) {
        console.error("❌ Notification failed:", notificationError);
      }

      toast({
        title: "สำเร็จ",
        description: "สร้าง Global Discount Code เรียบร้อย!",
      });

      setIsGlobalDiscountDialogOpen(false);
      setGlobalDiscountForm({
        discount_percentage: 10,
        max_uses: undefined,
        expires_at: "",
      });
      fetchGlobalDiscountCodes();
    } catch (error) {
      console.error("Error creating global discount code:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้าง Global Discount Code ได้",
        variant: "destructive",
      });
    } finally {
      setIsDiscountSubmitting(false);
    }
  };

  const toggleGlobalDiscountCodeStatus = async (
    codeId: string,
    currentStatus: boolean
  ) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/global-discount-codes/${codeId}/toggle`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_active: !currentStatus }),
        }
      );

      if (!response.ok) throw new Error("Failed to toggle status");

      fetchGlobalDiscountCodes();
      toast({
        title: "สำเร็จ",
        description: "เปลี่ยนสถานะ Global Discount Code แล้ว",
      });
    } catch (error) {
      console.error("Error toggling global code status:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปลี่ยนสถานะได้",
        variant: "destructive",
      });
    }
  };

  const deleteGlobalDiscountCode = async (codeId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบโค้ดส่วนลดนี้?")) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/global-discount-codes/${codeId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok)
        throw new Error("Failed to delete global discount code");

      fetchGlobalDiscountCodes();
      toast({
        title: "สำเร็จ",
        description: "ลบโค้ดส่วนลดทั่วไปแล้ว",
      });
    } catch (error) {
      console.error("Error deleting global discount code:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบโค้ดส่วนลดทั่วไปได้",
        variant: "destructive",
      });
    }
  };

  // Image upload functions
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "กรุณาเลือกไฟล์รูปภาพเท่านั้น",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      setFormData((prev) => ({ ...prev, image_url: objectUrl }));

      toast({
        title: "สำเร็จ",
        description: "อัปโหลดรูปภาพเรียบร้อยแล้ว",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปโหลดรูปภาพได้",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image_url: "" }));
  };

  const toggleAdvertiser = (advertiserId: string) => {
    setFormData((prev) => ({
      ...prev,
      advertiser_ids: prev.advertiser_ids.includes(advertiserId)
        ? prev.advertiser_ids.filter((id) => id !== advertiserId)
        : [...prev.advertiser_ids, advertiserId],
    }));
  };

  const getSelectedAdvertiserNames = () => {
    const selectedAdvertisers = advertisers.filter((adv) =>
      formData.advertiser_ids.includes(adv.id)
    );
    if (selectedAdvertisers.length === 0) return "ไม่ได้เลือกผู้โฆษณา";
    if (selectedAdvertisers.length === 1)
      return selectedAdvertisers[0].display_name;
    return `${selectedAdvertisers[0].display_name} และอีก ${
      selectedAdvertisers.length - 1
    } คน`;
  };

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData({
      title: pkg.title,
      location: pkg.location,
      price: pkg.price.toString(),
      duration: pkg.duration.toString(),
      description: pkg.description || "",
      image_url: pkg.image_url || "",
      advertiser_ids: pkg.advertisers?.map((a) => a.id) || [],
      tags: normalizeTags(pkg.tags),
      available_from: pkg.available_from || "",
      available_to: pkg.available_to || "",
      max_guests: pkg.max_guests.toString(),
      discount_percentage: pkg.discount_percentage.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบแพคเกจนี้?")) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/travel-packages/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete package");
      }

      toast({
        title: "สำเร็จ",
        description: "ลบแพคเกจเรียบร้อยแล้ว",
      });

      fetchPackages();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบแพคเกจได้",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      location: "",
      price: "",
      duration: "",
      description: "",
      image_url: "",
      advertiser_ids: [],
      tags: [],
      available_from: "",
      available_to: "",
      max_guests: "10",
      discount_percentage: "0",
    });
    setEditingPackage(null);
    setNewTag("");
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tag.trim()] });
      setNewTag("");
      setTagComboOpen(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const fetchPackageBookings = async (
    packageId: string,
    packageTitle: string
  ) => {
    try {
      const response = await bookingAPI.getByPackageId(packageId);
      const bookingsData = response.bookings || [];

      if (bookingsData.length === 0) {
        setSelectedPackageBookings([]);
        setSelectedPackageTitle(packageTitle);
        setBookingsDialogOpen(true);
        return;
      }

      const bookingsWithProfiles = bookingsData.map((booking) => ({
        ...booking,
        profiles: {
          display_name: booking.contact_name || "ไม่ระบุชื่อ",
          phone: booking.contact_phone || "ไม่ระบุเบอร์",
          email: booking.contact_email || "ไม่ระบุอีเมล",
        },
      }));

      setSelectedPackageBookings(bookingsWithProfiles);
      setSelectedPackageTitle(packageTitle);
      setBookingsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลการจองได้",
        variant: "destructive",
      });
    }
  };

  const availableTagsForSelection = existingTags.filter(
    (tag) => !formData.tags.includes(tag)
  );

  const getAdvertiserNames = (advertisers: User[]) => {
    if (!advertisers || advertisers.length === 0) return "ไม่มีผู้โฆษณา";
    return advertisers.map((a) => a.display_name).join(", ");
  };

  const filteredPackages = packages.filter((pkg) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesTitle = pkg.title.toLowerCase().includes(searchLower);
    const matchesLocation = pkg.location.toLowerCase().includes(searchLower);
    const tags = normalizeTags(pkg.tags);
    const matchesTags = tags.some(
      (tag) =>
        typeof tag === "string" && tag.toLowerCase().includes(searchLower)
    );
    return matchesTitle || matchesLocation || matchesTags;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <Navbar />
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">จัดการแพคเกจและโค้ดส่วนลด</h1>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="packages">จัดการแพคเกจ</TabsTrigger>
          <TabsTrigger value="global-discounts">
            โค้ดส่วนลดผู้ใช้ทั่วไป
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">แพคเกจท่องเที่ยว</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  สร้างแพคเกจใหม่
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPackage ? "แก้ไขแพคเกจ" : "สร้างแพคเกจใหม่"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Package Form - ย่อสั้นลงเพื่อประหยัดพื้นที่ */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">ชื่อแพคเกจ *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">สถานที่ *</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">ราคา (บาท) *</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="discount">ส่วนลด (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.discount_percentage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discount_percentage: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="available_from">วันที่เริ่ม</Label>
                      <Input
                        id="available_from"
                        type="date"
                        value={formData.available_from}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            available_from: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="available_to">วันที่สิ้นสุด</Label>
                      <Input
                        id="available_to"
                        type="date"
                        value={formData.available_to}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            available_to: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_guests">
                        จำนวนผู้เข้าร่วมสูงสุด *
                      </Label>
                      <Input
                        id="max_guests"
                        type="number"
                        min="1"
                        value={formData.max_guests}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_guests: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Auto-calculated duration display */}
                  {formData.available_from && formData.available_to && (
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium">
                          ระยะเวลาที่คำนวณได้
                        </Label>
                      </div>
                      <p className="text-lg font-semibold text-primary">
                        {formData.duration} วัน
                      </p>
                      <p className="text-sm text-muted-foreground">
                        คำนวณจากวันที่เริ่ม - วันที่สิ้นสุด
                      </p>
                    </div>
                  )}

                  {/* Advertiser Selection */}
                  <div>
                    <Label htmlFor="advertisers">ผู้โฆษณา</Label>
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setIsAdvertiserModalOpen(true)}
                      >
                        <span>{getSelectedAdvertiserNames()}</span>
                        <Users className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-4">
                    <Label htmlFor="image">รูปภาพแพคเกจ *</Label>
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                        isDragOver
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {formData.image_url ? (
                        <div className="space-y-4">
                          <img
                            src={formData.image_url}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={removeImage}
                            className="w-full"
                          >
                            <X className="w-4 h-4 mr-2" />
                            ลบรูปภาพ
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
                            📷
                          </div>
                          <p className="text-gray-600">
                            ลากรูปภาพมาที่นี่ หรือคลิกเพื่อเลือก
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
                            รองรับไฟล์ JPG, PNG (สูงสุด 5MB)
                          </p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>

                    {isUploading && (
                      <div className="text-center text-sm text-gray-500">
                        กำลังอัปโหลด...
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="image_url">หรือใส่ URL รูปภาพ</Label>
                      <Input
                        type="url"
                        id="image_url"
                        value={formData.image_url}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            image_url: e.target.value,
                          });
                          if (imagePreview) {
                            URL.revokeObjectURL(imagePreview);
                            setImagePreview(null);
                          }
                        }}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">รายละเอียด</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={4}
                    />
                  </div>

                  {/* Tags Section */}
                  <div>
                    <Label htmlFor="tags">แท็ก</Label>
                    <div className="space-y-3">
                      <Popover
                        open={tagComboOpen}
                        onOpenChange={setTagComboOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={tagComboOpen}
                            className="w-full justify-between"
                          >
                            เพิ่มแท็ก...
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput
                              placeholder="ค้นหาแท็ก..."
                              value={newTag}
                              onValueChange={setNewTag}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {newTag && (
                                  <div className="p-2">
                                    <Button
                                      variant="ghost"
                                      className="w-full"
                                      onClick={() => addTag(newTag)}
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      เพิ่ม "{newTag}"
                                    </Button>
                                  </div>
                                )}
                              </CommandEmpty>
                              <CommandGroup>
                                {availableTagsForSelection.map((tag) => (
                                  <CommandItem
                                    key={tag}
                                    onSelect={() => addTag(tag)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.tags.includes(tag)
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {tag}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                          <div
                            key={tag}
                            className="flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                          >
                            {tag}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-2 h-auto p-0 text-blue-600 hover:text-blue-800"
                              onClick={() => removeTag(tag)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {editingPackage ? "อัปเดต" : "สร้าง"}แพคเกจ
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาแพคเกจตามชื่อ สถานที่ หรือแท็ก..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Packages List */}
          <div className="grid gap-6">
            {filteredPackages.map((pkg) => (
              <Card key={pkg.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{pkg.title}</CardTitle>
                      <p className="text-muted-foreground">{pkg.location}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="font-semibold text-green-600">
                          ฿{pkg.price?.toLocaleString()}
                        </span>
                        {pkg.discount_percentage > 0 && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                            ลด {pkg.discount_percentage}%
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {pkg.duration} วัน
                        </span>
                        <span className="text-muted-foreground">
                          สูงสุด {pkg.max_guests} คน
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">
                          ผู้โฆษณา: {getAdvertiserNames(pkg.advertisers)}
                        </p>
                      </div>
                      {pkg.tags && normalizeTags(pkg.tags).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {normalizeTags(pkg.tags).map((tag, index) => (
                            <span
                              key={index}
                              className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchPackageBookings(pkg.id, pkg.title)}
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        จอง
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(pkg)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(pkg.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div></div>
                    {pkg.image_url && (
                      <img
                        src={pkg.image_url}
                        alt={pkg.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {pkg.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Global Discount Codes Tab */}
        <TabsContent value="global-discounts" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">โค้ดส่วนลดผู้ใช้ทั่วไป</h2>
            <Dialog
              open={isGlobalDiscountDialogOpen}
              onOpenChange={setIsGlobalDiscountDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setGlobalDiscountForm({
                      discount_percentage: 10,
                      max_uses: undefined,
                      expires_at: "",
                    });
                    setIsGlobalDiscountDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  สร้างโค้ดส่วนลดผู้ใช้ทั่วไป
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>สร้างโค้ดส่วนลดผู้ใช้ทั่วไป</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    โค้ดนี้จะใช้ได้กับทุกแพคเกจ และไม่มีค่าคอมมิชชั่น
                  </p>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="global-discount" className="text-right">
                      ส่วนลด (%)
                    </Label>
                    <Input
                      id="global-discount"
                      type="number"
                      value={globalDiscountForm.discount_percentage}
                      onChange={(e) =>
                        setGlobalDiscountForm({
                          ...globalDiscountForm,
                          discount_percentage: Number(e.target.value),
                        })
                      }
                      min="1"
                      max="50"
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="global-max-uses" className="text-right">
                      จำนวนใช้สูงสุด
                    </Label>
                    <Input
                      id="global-max-uses"
                      type="number"
                      value={globalDiscountForm.max_uses || ""}
                      onChange={(e) =>
                        setGlobalDiscountForm({
                          ...globalDiscountForm,
                          max_uses: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      min="1"
                      placeholder="ไม่จำกัด"
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="global-expires" className="text-right">
                      หมดอายุ
                    </Label>
                    <Input
                      id="global-expires"
                      type="datetime-local"
                      value={globalDiscountForm.expires_at || ""}
                      onChange={(e) =>
                        setGlobalDiscountForm({
                          ...globalDiscountForm,
                          expires_at: e.target.value,
                        })
                      }
                      className="col-span-3"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsGlobalDiscountDialogOpen(false)}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    onClick={handleCreateGlobalDiscountCode}
                    disabled={isDiscountSubmitting}
                  >
                    {isDiscountSubmitting ? "กำลังสร้าง..." : "สร้างโค้ดส่วนลด"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Global Discount Codes List */}
          {globalCodes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Percent className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">
                  ยังไม่มีโค้ดส่วนลดผู้ใช้ทั่วไป
                </p>
                <p className="text-sm text-gray-400 text-center">
                  เริ่มต้นสร้างโค้ดส่วนลดสำหรับผู้ใช้ทั่วไป
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {globalCodes.map((code) => (
                <Card key={code.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-lg font-bold bg-gray-100 px-3 py-1 rounded">
                            {code.code}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-sm ${
                              code.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {code.is_active ? "ใช้งานได้" : "ปิดการใช้งาน"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>ส่วนลด {code.discount_percentage}%</span>
                          <span>
                            สร้างเมื่อ{" "}
                            {new Date(code.created_at).toLocaleDateString(
                              "th-TH"
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-blue-600">
                          ใช้ได้กับทุกแพคเกจ • ไม่มีค่าคอมมิชชั่น
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleGlobalDiscountCodeStatus(
                              code.id,
                              code.is_active
                            )
                          }
                        >
                          {code.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteGlobalDiscountCode(code.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bookings Dialog */}
      <Dialog open={bookingsDialogOpen} onOpenChange={setBookingsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>การจองแพคเกจ: {selectedPackageTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPackageBookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                ยังไม่มีการจองสำหรับแพคเกจนี้
              </p>
            ) : (
              <div className="grid gap-4">
                {selectedPackageBookings.map((booking) => (
                  <Card key={booking.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4">
                          <span className="font-semibold">
                            {booking.profiles.display_name}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              booking.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <span>📞 {booking.profiles.phone}</span>
                          <span>📧 {booking.profiles.email}</span>
                          <span>👥 {booking.guest_count} คน</span>
                          <span>
                            📅{" "}
                            {new Date(booking.booking_date).toLocaleDateString(
                              "th-TH"
                            )}
                          </span>
                        </div>
                        {booking.special_requests && (
                          <p className="text-sm text-muted-foreground mt-2">
                            📝 {booking.special_requests}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Advertiser Selection Modal */}
      <Dialog
        open={isAdvertiserModalOpen}
        onOpenChange={setIsAdvertiserModalOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เลือกผู้โฆษณา</DialogTitle>
            <p className="text-sm text-muted-foreground">
              เลือกผู้โฆษณาที่จะรับผิดชอบแพ็กเกจนี้
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {advertisers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                ไม่มีผู้โฆษณาในระบบ
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {advertisers.map((advertiser) => (
                  <div
                    key={advertiser.id}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      formData.advertiser_ids.includes(advertiser.id)
                        ? "bg-blue-50 border-blue-300"
                        : "hover:bg-gray-50"
                    )}
                    onClick={() => toggleAdvertiser(advertiser.id)}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center",
                        formData.advertiser_ids.includes(advertiser.id)
                          ? "bg-blue-600 border-blue-600"
                          : "border-gray-300"
                      )}
                    >
                      {formData.advertiser_ids.includes(advertiser.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{advertiser.display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {advertiser.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdvertiserModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={() => setIsAdvertiserModalOpen(false)}
            >
              เสร็จสิ้น ({formData.advertiser_ids.length} คน)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
