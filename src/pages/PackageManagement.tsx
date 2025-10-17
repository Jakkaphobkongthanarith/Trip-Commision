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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Navigate } from "react-router-dom";

interface Package {
  id: string;
  title: string;
  location: string;
  price: number;
  duration: number;
  description: string;
  image_url: string;
  advertisers: User[]; // รองรับ advertiser หลายคน
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
  max_uses?: number; // เพิ่มใหม่
  expires_at?: string; // วันหมดอายุ (optional)
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

  // Discount Code states - เหลือเฉพาะ Global
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
    advertiser_ids: [] as string[], // รองรับ advertiser หลายคน
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
      // ใช้ Backend API ที่ส่งข้อมูล advertiser มาพร้อมกัน
      const response = await fetch(`${API_BASE_URL}/api/travel-packages`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // แปลงข้อมูลให้ตรงกับ format ที่ frontend ต้องการ
      const packagesWithAdvertisers = (data || []).map((pkg: any) => ({
        ...pkg,
        tags: normalizeTags(pkg.tags),
        // รองรับทั้ง advertisers array และ advertiser single object
        advertisers:
          pkg.advertisers && pkg.advertisers.length > 0
            ? pkg.advertisers
            : pkg.advertiser
            ? [pkg.advertiser]
            : [],
      }));

      console.log("📦 Packages with advertisers:", packagesWithAdvertisers);
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

      // Backend ส่ง array ของ tags โดยตรงแล้ว
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
        // เพิ่ม advertiser_ids สำหรับ multiple advertisers support
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

        // อัปเดต package-advertiser relationships
        await updatePackageAdvertisers(
          editingPackage.id,
          formData.advertiser_ids,
          editingPackage.advertisers?.map((a) => a.id) || [] // ส่ง advertiser เก่าด้วย
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

        // เพิ่ม package-advertiser relationships
        if (newPackage && formData.advertiser_ids.length > 0) {
          await updatePackageAdvertisers(
            newPackage.id,
            formData.advertiser_ids,
            [] // สำหรับ create package ไม่มี advertiser เก่า
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

  // Function to notify advertisers when assigned to a package
  const notifyAssignedAdvertisers = async (
    packageId: string,
    advertiserIds: string[]
  ) => {
    try {
      console.log("🔔 Notifying assigned advertisers:", advertiserIds);

      // Get package details first
      const packageDetails = packages.find((pkg) => pkg.id === packageId);
      const packageName = packageDetails?.title || `Package ID: ${packageId}`;

      // Send notification to each assigned advertiser
      for (const advertiserId of advertiserIds) {
        try {
          await sendNotificationToAdvertiser(
            advertiserId,
            `🎯 คุณได้รับมอบหมายให้โฆษณาแพ็กเกจ "${packageName}" แล้ว! เริ่มสร้างโค้ดส่วนลดและโปรโมทได้เลย`,
            "package_assignment",
            packageId // ส่ง packageId เพิ่มเติม
          );
          console.log(
            `✅ Assignment notification sent to advertiser: ${advertiserId}`
          );
        } catch (error) {
          console.error(
            `❌ Failed to notify advertiser ${advertiserId}:`,
            error
          );
        }
      }

      // Trigger notification panel refresh
      window.dispatchEvent(new CustomEvent("notificationCreated"));

      console.log("✅ All assignment notifications sent");
    } catch (error) {
      console.error("❌ Error in notifyAssignedAdvertisers:", error);
    }
  };

  const updatePackageAdvertisers = async (
    packageId: string,
    newAdvertiserIds: string[],
    oldAdvertiserIds: string[] = [] // Parameter ใหม่สำหรับ advertiser เก่า
  ) => {
    try {
      // ใช้ Backend API แทน Supabase เพื่ออัปเดต package-advertiser relationships
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

      console.log("✅ Package advertisers updated successfully");

      // หา advertiser ใหม่ที่ถูกเพิ่มเข้ามา (ไม่ใช่คนเก่า)
      const newlyAssignedAdvertisers = newAdvertiserIds.filter(
        (id) => !oldAdvertiserIds.includes(id)
      );

      console.log("🔍 Newly assigned advertisers:", newlyAssignedAdvertisers);

      // ส่ง notification เฉพาะ advertiser ใหม่เท่านั้น
      if (newlyAssignedAdvertisers.length > 0) {
        await notifyAssignedAdvertisers(packageId, newlyAssignedAdvertisers);
      } else {
        console.log("ℹ️ No new advertisers to notify");
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
      // 5MB limit
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);

      // Upload to your backend or use a service like Cloudinary
      // For now, we'll use a placeholder service or create Object URL
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

  // Advertiser modal functions
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
      // ใช้ Backend API เพื่อลบแพ็กเกจ (จะจัดการ junction table relationships ได้อัตโนมัติ)
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

  // Notification functions
  const sendNotificationToAdvertiser = async (
    advertiserId: string,
    message: string,
    type: string = "discount_code", // Default type
    packageId?: string // เพิ่ม packageId เป็น optional parameter
  ) => {
    try {
      console.log(
        "🔔 Sending notification to advertiser:",
        advertiserId,
        message
      );

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
        // เพิ่ม action_url และ data สำหรับ navigation
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

      console.log(
        "🔔 Advertiser notification response status:",
        response.status
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error(
          "❌ Failed to send notification to advertiser:",
          errorData
        );
        throw new Error(`Notification failed: ${response.status}`);
      } else {
        const responseData = await response.json();
        console.log(
          "✅ Notification sent to advertiser successfully:",
          responseData
        );
      }
    } catch (error) {
      console.error("❌ Error sending notification:", error);
      throw error;
    }
  };

  const sendNotificationToAllUsers = async (message: string) => {
    try {
      console.log("🔔 Sending notification to current user:", message);

      // Get current user ID from storage
      const userId =
        localStorage.getItem("userId") || sessionStorage.getItem("userId");

      if (!userId) {
        console.warn("❌ No user ID found, cannot send notification");
        return;
      }

      console.log("🔔 Sending to user ID:", userId);

      // Send notification to current user only (since broadcast doesn't exist)
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId, // Use actual user ID
          title: "โค้ดส่วนลดใหม่!",
          message: message,
          type: "global_discount",
          category: "promotion",
          priority: "medium",
        }),
      });

      console.log("🔔 Notification response status:", response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ Failed to send notification:", errorData);
        throw new Error(`Notification failed: ${response.status}`);
      } else {
        const responseData = await response.json();
        console.log("✅ Notification sent successfully:", responseData);
      }
    } catch (error) {
      console.error("❌ Error sending notification:", error);
      throw error;
    }
  };

  // Discount Code functions
  const handleCreateAdvertiserDiscountCode = async () => {
    if (
      !advertiserDiscountForm.advertiser_id ||
      !advertiserDiscountForm.package_id ||
      advertiserDiscountForm.discount_percentage <= 0 ||
      advertiserDiscountForm.commission_rate < 0
    ) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    setIsDiscountSubmitting(true);
    try {
      // Prepare data with proper date format
      const requestData = {
        advertiser_id: advertiserDiscountForm.advertiser_id,
        package_id: advertiserDiscountForm.package_id,
        discount_percentage: advertiserDiscountForm.discount_percentage,
        commission_rate: advertiserDiscountForm.commission_rate,
        max_uses: advertiserDiscountForm.max_uses,
        // Only include expires_at if it's not empty, and format it properly
        ...(advertiserDiscountForm.expires_at &&
          advertiserDiscountForm.expires_at.trim() !== "" && {
            expires_at: new Date(
              advertiserDiscountForm.expires_at
            ).toISOString(),
          }),
      };

      console.log("🔍 Sending advertiser discount data:", requestData);

      const response = await fetch(
        `${API_BASE_URL}/api/discount-codes/advertiser`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ Advertiser discount API error:", errorData);
        throw new Error("Failed to create advertiser discount code");
      }

      const responseData = await response.json();
      console.log("✅ Advertiser discount created:", responseData);

      // ส่ง notification ให้ advertiser
      const selectedAdvertiser = advertisers.find(
        (adv) => adv.id === advertiserDiscountForm.advertiser_id
      );
      if (selectedAdvertiser) {
        try {
          // Extract discount code properly - it's nested in responseData.code.code
          const advertiserDiscountCode =
            responseData.code?.code ||
            responseData.code?.id ||
            responseData.discount_code ||
            "ตรวจสอบในระบบ";
          console.log(
            "🔍 Extracted advertiser discount code:",
            advertiserDiscountCode
          );

          await sendNotificationToAdvertiser(
            selectedAdvertiser.id,
            `คุณได้รับโค้ดส่วนลด ${advertiserDiscountForm.discount_percentage}% ใหม่! โค้ด: ${advertiserDiscountCode}`
          );
          console.log("✅ Advertiser notification sent successfully");

          // Trigger notification panel refresh
          window.dispatchEvent(new CustomEvent("notificationCreated"));
        } catch (notificationError) {
          console.error(
            "❌ Advertiser notification failed:",
            notificationError
          );
          // Don't fail the whole process if notification fails
          toast({
            title: "แจ้งเตือน",
            description:
              "สร้าง Discount Code สำเร็จ แต่การแจ้งเตือน Advertiser ล้มเหลว",
            variant: "default",
          });
        }
      } else {
        console.warn("❌ Selected advertiser not found for notification");
      }

      toast({
        title: "สำเร็จ",
        description: "สร้าง Discount Code สำหรับ Advertiser เรียบร้อย!",
      });

      setIsAdvertiserDiscountDialogOpen(false);
      setAdvertiserDiscountForm({
        advertiser_id: "",
        package_id: "",
        discount_percentage: 10,
        commission_rate: 5.0,
        max_uses: undefined,
        expires_at: "",
      });
      fetchAdvertiserDiscountCodes();
    } catch (error) {
      console.error("Error creating advertiser discount code:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้าง Discount Code ได้",
        variant: "destructive",
      });
    } finally {
      setIsDiscountSubmitting(false);
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
      // Prepare data with proper date format
      const requestData = {
        discount_percentage: globalDiscountForm.discount_percentage,
        max_uses: globalDiscountForm.max_uses,
        // Only include expires_at if it's not empty, and format it properly
        ...(globalDiscountForm.expires_at &&
          globalDiscountForm.expires_at.trim() !== "" && {
            expires_at: new Date(globalDiscountForm.expires_at).toISOString(),
          }),
      };

      console.log("🔍 Sending global discount data:", requestData);

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
        const errorData = await response.text();
        console.error("❌ Global discount API error:", errorData);
        throw new Error("Failed to create global discount code");
      }

      const responseData = await response.json();
      console.log("✅ Global discount created:", responseData);

      // Extract discount code correctly - handle different response structures
      let discountCode = "ตรวจสอบในระบบ";

      if (responseData.code) {
        // If responseData.code is a string
        if (typeof responseData.code === "string") {
          discountCode = responseData.code;
        }
        // If responseData.code is an object with code property
        else if (responseData.code.code) {
          discountCode = responseData.code.code;
        }
        // If responseData.code is an object with id property
        else if (responseData.code.id) {
          discountCode = responseData.code.id;
        }
      }
      // Try other possible response structures
      else if (responseData.discount_code) {
        discountCode = responseData.discount_code;
      } else if (responseData.id) {
        discountCode = responseData.id;
      }

      console.log("🔍 Extracted discount code:", discountCode);

      // ส่ง notification ให้ผู้ใช้ทั้งหมด
      try {
        const notificationMessage = `🎉 โค้ดส่วนลดใหม่! ลด ${globalDiscountForm.discount_percentage}% สำหรับทุกแพ็กเกจ โค้ด: ${discountCode}`;

        await sendNotificationToAllUsers(notificationMessage);
        console.log("✅ Notification sent successfully");

        // Trigger notification panel refresh by dispatching custom event
        window.dispatchEvent(new CustomEvent("notificationCreated"));
      } catch (notificationError) {
        console.error("❌ Notification failed:", notificationError);
        // Don't fail the whole process if notification fails
        toast({
          title: "แจ้งเตือน",
          description: "สร้าง Discount Code สำเร็จ แต่การส่งแจ้งเตือนล้มเหลว",
          variant: "default",
        });
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

  const toggleAdvertiserDiscountCodeStatus = async (
    codeId: string,
    currentStatus: boolean
  ) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/discount-codes/${codeId}/toggle`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_active: !currentStatus }),
        }
      );

      if (!response.ok) throw new Error("Failed to toggle status");

      fetchAdvertiserDiscountCodes();
      toast({
        title: "สำเร็จ",
        description: "เปลี่ยนสถานะ Discount Code แล้ว",
      });
    } catch (error) {
      console.error("Error toggling code status:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปลี่ยนสถานะได้",
        variant: "destructive",
      });
    }
  };

  // ลบโค้ดส่วนลด Advertiser
  const deleteAdvertiserDiscountCode = async (codeId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบโค้ดส่วนลดนี้?")) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/discount-codes/${codeId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete discount code");

      fetchAdvertiserDiscountCodes();
      toast({
        title: "สำเร็จ",
        description: "ลบโค้ดส่วนลดแล้ว",
      });
    } catch (error) {
      console.error("Error deleting discount code:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบโค้ดส่วนลดได้",
        variant: "destructive",
      });
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

  // ลบโค้ดส่วนลด Global
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

  const availableTagsForSelection = existingTags.filter(
    (tag) => !formData.tags.includes(tag)
  );

  const getAdvertiserNames = (advertisers: User[]) => {
    if (!advertisers || advertisers.length === 0) return "ไม่มีผู้โฆษณา";
    return advertisers.map((a) => a.display_name).join(", ");
  };

  // Filter packages based on search term
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="packages">จัดการแพคเกจ</TabsTrigger>
          <TabsTrigger value="advertiser-discounts">
            โค้ดส่วนลด Advertiser
          </TabsTrigger>
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
                  {/* Package Form Fields */}
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

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="price">ราคาหลังลด (บาท) *</Label>
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
                    <div>
                      <Label htmlFor="duration">ระยะเวลา (วัน) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        value={formData.duration}
                        onChange={(e) =>
                          setFormData({ ...formData, duration: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="available_from">
                        วันที่เริ่มให้บริการ
                      </Label>
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
                      <Label htmlFor="available_to">
                        วันที่สิ้นสุดการให้บริการ
                      </Label>
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
                      <Label htmlFor="max_guests">จำนวนคนสูงสุด *</Label>
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

                  {/* Advertiser Selection with Modal */}
                  <div>
                    <Label htmlFor="advertisers">ผู้โฆษณา</Label>
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAdvertiserModalOpen(true)}
                        className="w-full justify-start text-left h-auto py-3"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">เลือกผู้โฆษณา</span>
                          <span className="text-sm text-muted-foreground">
                            {getSelectedAdvertiserNames()}
                          </span>
                        </div>
                      </Button>

                      {/* Selected advertisers preview */}
                      {formData.advertiser_ids.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {advertisers
                            .filter((adv) =>
                              formData.advertiser_ids.includes(adv.id)
                            )
                            .map((advertiser) => (
                              <Badge
                                key={advertiser.id}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                {advertiser.display_name}
                                <X
                                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                                  onClick={() =>
                                    toggleAdvertiser(advertiser.id)
                                  }
                                />
                              </Badge>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image Upload Section */}
                  <div className="space-y-4">
                    <Label htmlFor="image">รูปภาพแพคเกจ *</Label>

                    {/* Drag and Drop Zone */}
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
                      {imagePreview ? (
                        <div className="text-center space-y-4">
                          <div className="relative inline-block">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="max-w-full max-h-48 rounded-lg object-cover"
                            />
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                          <p className="text-sm text-gray-600">
                            คลิกเพื่อเปลี่ยนรูปภาพ หรือลากและวางรูปใหม่
                          </p>
                        </div>
                      ) : (
                        <div className="text-center space-y-4">
                          <div className="mx-auto w-12 h-12 text-gray-400">
                            <svg
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-gray-600">
                              ลากและวางรูปภาพที่นี่
                            </p>
                            <p className="text-sm text-gray-500">
                              หรือคลิกเพื่อเลือกไฟล์ (สูงสุด 5MB)
                            </p>
                          </div>
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
                      <div className="flex items-center space-x-2 text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm">กำลังอัปโหลด...</span>
                      </div>
                    )}

                    {/* Alternative URL Input */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="image_url"
                        className="text-sm text-gray-600"
                      >
                        หรือใส่ URL รูปภาพ
                      </Label>
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
                            เลือกแท็กหรือสร้างใหม่...
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput
                              placeholder="ค้นหาหรือพิมพ์แท็กใหม่..."
                              value={newTag}
                              onValueChange={setNewTag}
                            />
                            <CommandList>
                              <CommandGroup>
                                {newTag &&
                                  !existingTags.includes(newTag.trim()) && (
                                    <CommandItem
                                      value={`create-${newTag}`}
                                      onSelect={() => addTag(newTag)}
                                      className="text-green-600"
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      สร้าง "{newTag}"
                                    </CommandItem>
                                  )}
                                {availableTagsForSelection
                                  .filter((tag) =>
                                    tag
                                      .toLowerCase()
                                      .includes(newTag.toLowerCase())
                                  )
                                  .map((tag) => (
                                    <CommandItem
                                      key={tag}
                                      value={tag}
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
                              {!newTag && existingTags.length === 0 && (
                                <CommandEmpty>ยังไม่มีแท็กในระบบ</CommandEmpty>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {tag}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => removeTag(tag)}
                            />
                          </Badge>
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
                      {editingPackage ? "อัปเดต" : "สร้าง"}
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
                      <CardTitle>{pkg.title}</CardTitle>
                      <p className="text-muted-foreground mt-1">
                        {pkg.location} • {pkg.duration} วัน • ฿
                        {pkg.price.toLocaleString()}
                        {pkg.discount_percentage > 0 && (
                          <span className="text-red-600 font-medium ml-2">
                            (ส่วนลด {pkg.discount_percentage}%)
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {pkg.max_guests && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            สูงสุด {pkg.max_guests} คน
                          </span>
                        )}
                        {(pkg.available_from || pkg.available_to) && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {pkg.available_from &&
                              new Date(pkg.available_from).toLocaleDateString(
                                "th-TH"
                              )}
                            {pkg.available_from && pkg.available_to && " - "}
                            {pkg.available_to &&
                              new Date(pkg.available_to).toLocaleDateString(
                                "th-TH"
                              )}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-blue-600 mt-1">
                        ผู้โฆษณา: {getAdvertiserNames(pkg.advertisers)}
                      </p>
                      {pkg.tags &&
                        Array.isArray(pkg.tags) &&
                        pkg.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pkg.tags.map(
                              (tag, index) =>
                                typeof tag === "string" && (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                )
                            )}
                          </div>
                        )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchPackageBookings(pkg.id, pkg.title)}
                        title="ดูการจอง"
                      >
                        <Users className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(pkg)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
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

        {/* Advertiser Discount Codes Tab */}
        <TabsContent value="advertiser-discounts" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">โค้ดส่วนลด Advertiser</h2>
            <Dialog
              open={isAdvertiserDiscountDialogOpen}
              onOpenChange={setIsAdvertiserDiscountDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setAdvertiserDiscountForm({
                      advertiser_id: "",
                      package_id: "",
                      discount_percentage: 10,
                      commission_rate: 5.0,
                      max_uses: undefined,
                      expires_at: "",
                    });
                    setIsAdvertiserDiscountDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  สร้างโค้ดส่วนลด Advertiser
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>สร้างโค้ดส่วนลดสำหรับ Advertiser</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    โค้ดนี้จะใช้ได้กับแพคเกจที่เลือกเท่านั้น
                  </p>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="advertiser" className="text-right">
                      Advertiser
                    </Label>
                    <Select
                      value={advertiserDiscountForm.advertiser_id}
                      onValueChange={(value) =>
                        setAdvertiserDiscountForm({
                          ...advertiserDiscountForm,
                          advertiser_id: value,
                          package_id: "", // รีเซ็ตแพคเกจเมื่อเปลี่ยน advertiser
                        })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="เลือก Advertiser" />
                      </SelectTrigger>
                      <SelectContent>
                        {advertisers.map((advertiser) => (
                          <SelectItem key={advertiser.id} value={advertiser.id}>
                            {advertiser.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="package" className="text-right">
                      แพคเกจ
                    </Label>
                    <Select
                      value={advertiserDiscountForm.package_id}
                      onValueChange={(value) =>
                        setAdvertiserDiscountForm({
                          ...advertiserDiscountForm,
                          package_id: value,
                        })
                      }
                      disabled={!advertiserDiscountForm.advertiser_id}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="เลือกแพคเกจ" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages
                          .filter((pkg) =>
                            pkg.advertisers.some(
                              (adv) =>
                                adv.id === advertiserDiscountForm.advertiser_id
                            )
                          )
                          .map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              {pkg.title} - {pkg.location}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="discount" className="text-right">
                      ส่วนลด (%)
                    </Label>
                    <Input
                      id="discount"
                      type="number"
                      value={advertiserDiscountForm.discount_percentage}
                      onChange={(e) =>
                        setAdvertiserDiscountForm({
                          ...advertiserDiscountForm,
                          discount_percentage: Number(e.target.value),
                        })
                      }
                      min="1"
                      max="50"
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="commission" className="text-right">
                      Commission (%)
                    </Label>
                    <Input
                      id="commission"
                      type="number"
                      value={advertiserDiscountForm.commission_rate}
                      onChange={(e) =>
                        setAdvertiserDiscountForm({
                          ...advertiserDiscountForm,
                          commission_rate: Number(e.target.value),
                        })
                      }
                      min="0"
                      max="50"
                      step="0.5"
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="max-uses" className="text-right">
                      จำนวนใช้สูงสุด
                    </Label>
                    <Input
                      id="max-uses"
                      type="number"
                      value={advertiserDiscountForm.max_uses || ""}
                      onChange={(e) =>
                        setAdvertiserDiscountForm({
                          ...advertiserDiscountForm,
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
                    <Label htmlFor="advertiser-expires" className="text-right">
                      วันหมดอายุ
                    </Label>
                    <Input
                      id="advertiser-expires"
                      type="datetime-local"
                      value={advertiserDiscountForm.expires_at || ""}
                      onChange={(e) =>
                        setAdvertiserDiscountForm({
                          ...advertiserDiscountForm,
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
                    onClick={() => setIsAdvertiserDiscountDialogOpen(false)}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    onClick={handleCreateAdvertiserDiscountCode}
                    disabled={isDiscountSubmitting}
                  >
                    {isDiscountSubmitting ? "กำลังสร้าง..." : "สร้างโค้ด"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Advertiser Discount Codes List */}
          {advertiserCodes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Percent className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">
                  ยังไม่มีโค้ดส่วนลด Advertiser
                </p>
                <p className="text-sm text-gray-400 text-center">
                  เริ่มต้นสร้างโค้ดส่วนลดสำหรับ Advertiser
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {advertiserCodes.map((code) => (
                <Card key={code.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-lg bg-gray-100 px-3 py-1 rounded">
                            {code.code}
                          </span>
                          <Badge
                            variant={code.is_active ? "default" : "destructive"}
                          >
                            {code.is_active ? "ใช้งานได้" : "ปิดใช้งาน"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Advertiser: {code.advertiser_name}</p>
                          <p>ส่วนลด: {code.discount_percentage}%</p>
                          <p>
                            วันที่สร้าง:{" "}
                            {new Date(code.created_at).toLocaleDateString(
                              "th-TH"
                            )}
                          </p>
                          <p className="text-blue-600">
                            ใช้ได้กับทุกแพคเกจที่ Advertiser นี้โฆษณา
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleAdvertiserDiscountCodeStatus(
                              code.id,
                              code.is_active
                            )
                          }
                        >
                          {code.is_active ? "ปิด" : "เปิด"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteAdvertiserDiscountCode(code.id)}
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
                      วันหมดอายุ
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
                    {isDiscountSubmitting ? "กำลังสร้าง..." : "สร้างโค้ด"}
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
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-lg bg-green-100 px-3 py-1 rounded">
                            {code.code}
                          </span>
                          <Badge
                            variant={code.is_active ? "default" : "destructive"}
                          >
                            {code.is_active ? "ใช้งานได้" : "ปิดใช้งาน"}
                          </Badge>
                          <Badge variant="secondary">Global</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>ส่วนลด: {code.discount_percentage}%</p>
                          <p>
                            วันที่สร้าง:{" "}
                            {new Date(code.created_at).toLocaleDateString(
                              "th-TH"
                            )}
                          </p>
                          <p className="text-green-600">
                            ใช้ได้กับทุกแพคเกจ ไม่มีค่าคอมมิชชั่น
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleGlobalDiscountCodeStatus(
                              code.id,
                              code.is_active
                            )
                          }
                        >
                          {code.is_active ? "ปิด" : "เปิด"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
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
                        <h4 className="font-medium">
                          {booking.profiles.display_name}
                        </h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>📞 {booking.profiles.phone}</p>
                          <p>Email: {booking.profiles.email}</p>
                          <p>ความต้องการพิเศษ: {booking.special_requests}</p>
                          <p>
                            📅 วันที่จอง:{" "}
                            {new Date(booking.booking_date).toLocaleDateString(
                              "th-TH"
                            )}
                          </p>
                          <p>👥 จำนวนผู้เดินทาง: {booking.guest_count} คน</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            booking.status === "confirmed"
                              ? "default"
                              : booking.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {booking.status === "pending" && "รอดำเนินการ"}
                          {booking.status === "confirmed" && "ยืนยันแล้ว"}
                          {booking.status === "cancelled" && "ยกเลิกแล้ว"}
                          {booking.status === "completed" && "เสร็จสิ้น"}
                        </Badge>
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
