import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { packageAPI, bookingAPI } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface AdvertiserDiscountCode {
  id: string;
  code: string;
  advertiser_id: string;
  advertiser_name: string;
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
}

interface GlobalDiscountCode {
  id: string;
  code: string;
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
}

interface CreateAdvertiserDiscountForm {
  advertiser_id: string;
  discount_percentage: number;
  expires_at?: string; // วันหมดอายุ (optional)
}

interface CreateGlobalDiscountForm {
  discount_percentage: number;
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

  // Discount Code states
  const [advertiserCodes, setAdvertiserCodes] = useState<
    AdvertiserDiscountCode[]
  >([]);
  const [globalCodes, setGlobalCodes] = useState<GlobalDiscountCode[]>([]);
  const [isAdvertiserDiscountDialogOpen, setIsAdvertiserDiscountDialogOpen] =
    useState(false);
  const [isGlobalDiscountDialogOpen, setIsGlobalDiscountDialogOpen] =
    useState(false);
  const [activeTab, setActiveTab] = useState<
    "packages" | "advertiser-discounts" | "global-discounts"
  >("packages");
  const [advertiserDiscountForm, setAdvertiserDiscountForm] =
    useState<CreateAdvertiserDiscountForm>({
      advertiser_id: "",
      discount_percentage: 10,
      expires_at: "",
    });
  const [globalDiscountForm, setGlobalDiscountForm] =
    useState<CreateGlobalDiscountForm>({
      discount_percentage: 10,
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

  useEffect(() => {
    if (userRole === "manager") {
      fetchPackages();
      fetchAdvertisers();
      fetchExistingTags();
      fetchAdvertiserDiscountCodes();
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
        // แปลง advertiser object เดี่ยวเป็น advertisers array สำหรับ backward compatibility
        advertisers: pkg.advertiser ? [pkg.advertiser] : [],
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
      const { data, error } = await supabase
        .from("travel_packages")
        .select("tags")
        .not("tags", "is", null);

      if (error) throw error;

      const allTags = new Set<string>();
      data?.forEach((pkg) => {
        if (pkg.tags && Array.isArray(pkg.tags)) {
          pkg.tags.forEach((tag) => allTags.add(tag));
        }
      });

      setExistingTags(Array.from(allTags).sort());
    } catch (error) {
      console.error("Error fetching existing tags:", error);
    }
  };

  const fetchAdvertiserDiscountCodes = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/manager/discount-codes`
      );
      if (!response.ok)
        throw new Error("Failed to fetch advertiser discount codes");

      const data = await response.json();
      setAdvertiserCodes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching advertiser discount codes:", error);
      setAdvertiserCodes([]);
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
      };

      if (editingPackage) {
        const { error } = await supabase
          .from("travel_packages")
          .update(packageData)
          .eq("id", editingPackage.id);

        if (error) throw error;

        // อัปเดต package-advertiser relationships
        await updatePackageAdvertisers(
          editingPackage.id,
          formData.advertiser_ids
        );

        toast({
          title: "สำเร็จ",
          description: "อัปเดตแพคเกจเรียบร้อยแล้ว",
        });
      } else {
        const { data: newPackage, error } = await supabase
          .from("travel_packages")
          .insert([packageData])
          .select()
          .single();

        if (error) throw error;

        // เพิ่ม package-advertiser relationships
        if (newPackage && formData.advertiser_ids.length > 0) {
          await updatePackageAdvertisers(
            newPackage.id,
            formData.advertiser_ids
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
    advertiserIds: string[]
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
          body: JSON.stringify({ advertiser_ids: advertiserIds }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update package advertisers");
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
    message: string
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: advertiserId,
          title: "โค้ดส่วนลดใหม่!",
          message: message,
          type: "discount_code",
        }),
      });

      if (!response.ok) {
        console.error("Failed to send notification to advertiser");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const sendNotificationToAllUsers = async (message: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/broadcast`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "โค้ดส่วนลดใหม่!",
            message: message,
            type: "global_discount",
          }),
        }
      );

      if (!response.ok) {
        console.error("Failed to send broadcast notification");
      }
    } catch (error) {
      console.error("Error sending broadcast notification:", error);
    }
  };

  // Discount Code functions
  const handleCreateAdvertiserDiscountCode = async () => {
    if (
      !advertiserDiscountForm.advertiser_id ||
      advertiserDiscountForm.discount_percentage <= 0
    ) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "กรุณากรอกข้อมูลให้ครบถ้วน",
        variant: "destructive",
      });
      return;
    }

    setIsDiscountSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/discount-codes/advertiser`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(advertiserDiscountForm),
        }
      );

      if (!response.ok)
        throw new Error("Failed to create advertiser discount code");

      const responseData = await response.json();

      // ส่ง notification ให้ advertiser
      const selectedAdvertiser = advertisers.find(
        (adv) => adv.id === advertiserDiscountForm.advertiser_id
      );
      if (selectedAdvertiser) {
        await sendNotificationToAdvertiser(
          selectedAdvertiser.id,
          `คุณได้รับโค้ดส่วนลด ${
            advertiserDiscountForm.discount_percentage
          }% ใหม่! โค้ด: ${responseData.code || "ตรวจสอบในระบบ"}`
        );
      }

      toast({
        title: "สำเร็จ",
        description: "สร้าง Discount Code สำหรับ Advertiser เรียบร้อย!",
      });

      setIsAdvertiserDiscountDialogOpen(false);
      setAdvertiserDiscountForm({
        advertiser_id: "",
        discount_percentage: 10,
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
      const response = await fetch(
        `${API_BASE_URL}/api/global-discount-codes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(globalDiscountForm),
        }
      );

      if (!response.ok)
        throw new Error("Failed to create global discount code");

      const responseData = await response.json();

      // ส่ง notification ให้ผู้ใช้ทั้งหมด
      await sendNotificationToAllUsers(
        `🎉 โค้ดส่วนลดใหม่! ลด ${
          globalDiscountForm.discount_percentage
        }% สำหรับทุกแพ็กเกจ โค้ด: ${responseData.code || "ตรวจสอบในระบบ"}`
      );

      toast({
        title: "สำเร็จ",
        description: "สร้าง Global Discount Code เรียบร้อย!",
      });

      setIsGlobalDiscountDialogOpen(false);
      setGlobalDiscountForm({
        discount_percentage: 10,
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

                  {/* Multiple Advertisers Selection */}
                  <div>
                    <Label htmlFor="advertisers">
                      ผู้โฆษณา (เลือกได้หลายคน)
                    </Label>
                    <div className="space-y-2">
                      {advertisers.map((advertiser) => (
                        <div
                          key={advertiser.id}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            id={`advertiser-${advertiser.id}`}
                            checked={formData.advertiser_ids.includes(
                              advertiser.id
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  advertiser_ids: [
                                    ...formData.advertiser_ids,
                                    advertiser.id,
                                  ],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  advertiser_ids:
                                    formData.advertiser_ids.filter(
                                      (id) => id !== advertiser.id
                                    ),
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`advertiser-${advertiser.id}`}>
                            {advertiser.display_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="image_url">URL รูปภาพ</Label>
                    <Input
                      id="image_url"
                      type="url"
                      value={formData.image_url}
                      onChange={(e) =>
                        setFormData({ ...formData, image_url: e.target.value })
                      }
                    />
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
                      discount_percentage: 10,
                      expires_at: "",
                    });
                    setIsAdvertiserDiscountDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  สร้างโค้ดส่วนลด Advertiser
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>สร้างโค้ดส่วนลดสำหรับ Advertiser</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    โค้ดนี้จะใช้ได้กับทุกแพคเกจที่ Advertiser คนนี้โฆษณา
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
    </div>
  );
}
