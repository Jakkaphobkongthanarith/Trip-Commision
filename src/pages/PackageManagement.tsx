import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, X, Check, ChevronsUpDown, Search, Users, Calendar, Percent } from "lucide-react";
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
  is_active: boolean;
  advertiser_id: string | null;
  tags: string[];
  available_from: string | null;
  available_to: string | null;
  max_guests: number;
  discount_percentage: number;
}

interface Booking {
  id: string;
  customer_id: string;
  booking_date: string;
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

export default function PackageManagement() {
  const { user } = useAuth();
  const { userRole, loading } = useUserRole();
  const { toast } = useToast();
  const [packages, setPackages] = useState<Package[]>([]);
  const [advertisers, setAdvertisers] = useState<User[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bookingsDialogOpen, setBookingsDialogOpen] = useState(false);
  const [selectedPackageBookings, setSelectedPackageBookings] = useState<Booking[]>([]);
  const [selectedPackageTitle, setSelectedPackageTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    price: "",
    duration: "",
    description: "",
    image_url: "",
    is_active: true,
    advertiser_id: "",
    tags: [] as string[],
    available_from: "",
    available_to: "",
    max_guests: "10",
    discount_percentage: "0"
  });
  const [newTag, setNewTag] = useState("");
  const [tagComboOpen, setTagComboOpen] = useState(false);

  // Redirect if not manager
  if (!loading && userRole !== "manager") {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (userRole === "manager") {
      fetchPackages();
      fetchAdvertisers();
      fetchExistingTags();
    }
  }, [userRole]);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from("travel_packages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลแพคเกจได้",
        variant: "destructive"
      });
    }
  };

  const fetchAdvertisers = async () => {
    try {
      // Get all advertiser user IDs first
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "advertiser");

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        setAdvertisers([]);
        return;
      }

      // Get profiles for those users
      const userIds = roleData.map(item => item.user_id);
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      if (profileError) throw profileError;

      const advertiserUsers = profileData?.map(profile => ({
        id: profile.user_id,
        display_name: profile.display_name || "ไม่ระบุชื่อ",
        email: ""
      })) || [];
      
      setAdvertisers(advertiserUsers);
    } catch (error) {
      console.error("Error fetching advertisers:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลผู้โฆษณาได้",
        variant: "destructive"
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

      // Flatten and deduplicate tags
      const allTags = new Set<string>();
      data?.forEach(pkg => {
        if (pkg.tags && Array.isArray(pkg.tags)) {
          pkg.tags.forEach(tag => allTags.add(tag));
        }
      });

      setExistingTags(Array.from(allTags).sort());
    } catch (error) {
      console.error("Error fetching existing tags:", error);
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
        is_active: formData.is_active,
        advertiser_id: formData.advertiser_id || null,
        tags: formData.tags,
        available_from: formData.available_from || null,
        available_to: formData.available_to || null,
        max_guests: parseInt(formData.max_guests),
        discount_percentage: parseFloat(formData.discount_percentage)
      };

      if (editingPackage) {
        const { error } = await supabase
          .from("travel_packages")
          .update(packageData)
          .eq("id", editingPackage.id);
        
        if (error) throw error;
        
        toast({
          title: "สำเร็จ",
          description: "อัปเดตแพคเกจเรียบร้อยแล้ว"
        });
      } else {
        const { error } = await supabase
          .from("travel_packages")
          .insert([packageData]);
        
        if (error) throw error;
        
        toast({
          title: "สำเร็จ",
          description: "สร้างแพคเกจใหม่เรียบร้อยแล้ว"
        });
      }

      fetchPackages();
      fetchExistingTags(); // Refresh tags after save
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
      is_active: pkg.is_active,
      advertiser_id: pkg.advertiser_id || "",
      tags: pkg.tags || [],
      available_from: pkg.available_from || "",
      available_to: pkg.available_to || "",
      max_guests: pkg.max_guests.toString(),
      discount_percentage: pkg.discount_percentage.toString()
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบแพคเกจนี้?")) return;

    try {
      const { error } = await supabase
        .from("travel_packages")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "สำเร็จ",
        description: "ลบแพคเกจเรียบร้อยแล้ว"
      });
      
      fetchPackages();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบแพคเกจได้",
        variant: "destructive"
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
      is_active: true,
      advertiser_id: "",
      tags: [],
      available_from: "",
      available_to: "",
      max_guests: "10",
      discount_percentage: "0"
    });
    setEditingPackage(null);
    setNewTag("");
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData({...formData, tags: [...formData.tags, tag.trim()]});
      setNewTag("");
      setTagComboOpen(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({...formData, tags: formData.tags.filter(tag => tag !== tagToRemove)});
  };

  const fetchPackageBookings = async (packageId: string, packageTitle: string) => {
    try {
      // First get bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, customer_id, booking_date, guest_count, status")
        .eq("package_id", packageId)
        .order("booking_date", { ascending: false });

      if (bookingsError) throw bookingsError;

      if (!bookingsData || bookingsData.length === 0) {
        setSelectedPackageBookings([]);
        setSelectedPackageTitle(packageTitle);
        setBookingsDialogOpen(true);
        return;
      }

      // Get customer profiles
      const customerIds = bookingsData.map(booking => booking.customer_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name, phone")
        .in("user_id", customerIds);

      if (profilesError) throw profilesError;

      // Combine data
      const bookingsWithProfiles = bookingsData.map(booking => {
        const profile = profilesData?.find(p => p.user_id === booking.customer_id);
        return {
          ...booking,
          profiles: {
            display_name: profile?.display_name || "ไม่ระบุชื่อ",
            phone: profile?.phone || "ไม่ระบุเบอร์",
            email: ""
          }
        };
      });

      setSelectedPackageBookings(bookingsWithProfiles);
      setSelectedPackageTitle(packageTitle);
      setBookingsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลการจองได้",
        variant: "destructive"
      });
    }
  };

  const availableTagsForSelection = existingTags.filter(tag => !formData.tags.includes(tag));

  const getAdvertiserName = (advertiserId: string) => {
    const advertiser = advertisers.find(a => a.id === advertiserId);
    return advertiser?.display_name || "ไม่ระบุ";
  };

  // Filter packages based on search term
  const filteredPackages = packages.filter(pkg => {
    const searchLower = searchTerm.toLowerCase();
    const matchesTitle = pkg.title.toLowerCase().includes(searchLower);
    const matchesLocation = pkg.location.toLowerCase().includes(searchLower);
    const matchesTags = pkg.tags?.some(tag => tag.toLowerCase().includes(searchLower)) || false;
    return matchesTitle || matchesLocation || matchesTags;
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">จัดการแพคเกจท่องเที่ยว</h1>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">ชื่อแพคเกจ *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="location">สถานที่ *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">ราคา (บาท) *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      required
                      className="flex-1"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Percent className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40">
                        <div className="space-y-2">
                          <Label htmlFor="discount">ส่วนลด (%)</Label>
                          <Input
                            id="discount"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={formData.discount_percentage}
                            onChange={(e) => setFormData({...formData, discount_percentage: e.target.value})}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label htmlFor="duration">ระยะเวลา (วัน) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="available_from">วันที่เริ่มให้บริการ</Label>
                  <Input
                    id="available_from"
                    type="date"
                    value={formData.available_from}
                    onChange={(e) => setFormData({...formData, available_from: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="available_to">วันที่สิ้นสุดการให้บริการ</Label>
                  <Input
                    id="available_to"
                    type="date"
                    value={formData.available_to}
                    onChange={(e) => setFormData({...formData, available_to: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="max_guests">จำนวนคนสูงสุด *</Label>
                  <Input
                    id="max_guests"
                    type="number"
                    min="1"
                    value={formData.max_guests}
                    onChange={(e) => setFormData({...formData, max_guests: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="advertiser">ผู้โฆษณา</Label>
                <Select value={formData.advertiser_id || "none"} onValueChange={(value) => 
                  setFormData({...formData, advertiser_id: value === "none" ? "" : value})
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้โฆษณา (ไม่บังคับ)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ไม่มีผู้โฆษณา</SelectItem>
                    {advertisers.map((advertiser) => (
                      <SelectItem key={advertiser.id} value={advertiser.id}>
                        {advertiser.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="image_url">URL รูปภาพ</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="tags">แท็ก</Label>
                <div className="space-y-3">
                  <Popover open={tagComboOpen} onOpenChange={setTagComboOpen}>
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
                            {newTag && !existingTags.includes(newTag.trim()) && (
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
                              .filter(tag => tag.toLowerCase().includes(newTag.toLowerCase()))
                              .map((tag) => (
                              <CommandItem
                                key={tag}
                                value={tag}
                                onSelect={() => addTag(tag)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.tags.includes(tag) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {tag}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          {!newTag && existingTags.length === 0 && (
                            <CommandEmpty>ยังไม่มีแท็กในระบบ</CommandEmpty>
                          )}
                          {newTag && availableTagsForSelection.filter(tag => 
                            tag.toLowerCase().includes(newTag.toLowerCase())
                          ).length === 0 && existingTags.includes(newTag.trim()) && (
                            <CommandEmpty>แท็กนี้มีอยู่แล้ว</CommandEmpty>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
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

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label htmlFor="is_active">เปิดใช้งาน</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
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

      <div className="grid gap-6">
        {filteredPackages.map((pkg) => (
          <Card key={pkg.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{pkg.title}</CardTitle>
                  <p className="text-muted-foreground mt-1">
                    {pkg.location} • {pkg.duration} วัน • ฿{pkg.price.toLocaleString()}
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
                        {pkg.available_from && new Date(pkg.available_from).toLocaleDateString('th-TH')}
                        {pkg.available_from && pkg.available_to && ' - '}
                        {pkg.available_to && new Date(pkg.available_to).toLocaleDateString('th-TH')}
                      </span>
                    )}
                  </div>
                   {pkg.advertiser_id && (
                     <p className="text-sm text-blue-600 mt-1">
                       ผู้โฆษณา: {getAdvertiserName(pkg.advertiser_id)}
                     </p>
                   )}
                   {pkg.tags && pkg.tags.length > 0 && (
                     <div className="flex flex-wrap gap-1 mt-2">
                       {pkg.tags.map((tag, index) => (
                         <Badge key={index} variant="outline" className="text-xs">
                           {tag}
                         </Badge>
                       ))}
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
                <span className={`px-2 py-1 rounded-full text-xs ${
                  pkg.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                  {pkg.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                </span>
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
                          <p>📅 วันที่จอง: {new Date(booking.booking_date).toLocaleDateString('th-TH')}</p>
                          <p>👥 จำนวนผู้เดินทาง: {booking.guest_count} คน</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={booking.status === 'confirmed' ? 'default' : 
                                  booking.status === 'cancelled' ? 'destructive' : 'secondary'}
                        >
                          {booking.status === 'pending' && 'รอดำเนินการ'}
                          {booking.status === 'confirmed' && 'ยืนยันแล้ว'}
                          {booking.status === 'cancelled' && 'ยกเลิกแล้ว'}
                          {booking.status === 'completed' && 'เสร็จสิ้น'}
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