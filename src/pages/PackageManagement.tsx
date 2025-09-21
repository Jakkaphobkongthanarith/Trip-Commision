import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const [isLoading, setIsLoading] = useState(true);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    price: "",
    duration: "",
    description: "",
    image_url: "",
    is_active: true,
    advertiser_id: "",
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState("");

  // Redirect if not manager
  if (!loading && userRole !== "manager") {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (userRole === "manager") {
      fetchPackages();
      fetchAdvertisers();
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
        tags: formData.tags
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
      tags: pkg.tags || []
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
      tags: []
    });
    setEditingPackage(null);
    setNewTag("");
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({...formData, tags: [...formData.tags, newTag.trim()]});
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({...formData, tags: formData.tags.filter(tag => tag !== tagToRemove)});
  };

  const getAdvertiserName = (advertiserId: string) => {
    const advertiser = advertisers.find(a => a.id === advertiserId);
    return advertiser?.display_name || "ไม่ระบุ";
  };

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
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                  />
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
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      placeholder="เพิ่มแท็ก..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      เพิ่ม
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
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

      <div className="grid gap-6">
        {packages.map((pkg) => (
          <Card key={pkg.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{pkg.title}</CardTitle>
                  <p className="text-muted-foreground mt-1">
                    {pkg.location} • {pkg.duration} วัน • ฿{pkg.price.toLocaleString()}
                  </p>
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
    </div>
  );
}