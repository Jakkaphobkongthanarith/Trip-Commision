import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Users,
  DollarSign,
  Code,
  BarChart3,
} from "lucide-react";

// API Base URL Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface DiscountCode {
  id: string;
  code: string;
  advertiser_id: string;
  advertiser_name: string;
  package_id?: string;
  package_name: string;
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
}

interface TravelPackage {
  id: string;
  title: string;
  price: number;
  location: string;
}

interface CreateCodeForm {
  package_id: string;
  discount_percentage: number;
}

const ManagerDashboard = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateCodeForm>({
    package_id: "",
    discount_percentage: 10,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API Request Helper
  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  };

  // Fetch All Discount Codes
  const fetchDiscountCodes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/manager/discount-codes`);
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("Backend not available or endpoint not found. Using empty data.");
        setDiscountCodes([]);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDiscountCodes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching discount codes:", error);
      setDiscountCodes([]);
    }
  };

  // Fetch All Travel Packages
  const fetchPackages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/manager/packages`);
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("Packages endpoint not available");
        setPackages([]);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPackages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching packages:", error);
      setPackages([]);
    }
  };

  // Create Discount Code
  const handleCreateCode = async () => {
    if (!createForm.package_id || createForm.discount_percentage <= 0) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        package_id: createForm.package_id === "all" ? null : createForm.package_id,
        discount_percentage: createForm.discount_percentage,
      };

      await apiRequest("/api/discount-codes", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      alert("สร้าง Discount Code สำเร็จ!");
      setIsCreateDialogOpen(false);
      setCreateForm({
        package_id: "",
        discount_percentage: 10,
      });
      fetchDiscountCodes();
    } catch (error) {
      console.error("Error creating discount code:", error);
      alert("เกิดข้อผิดพลาดในการสร้าง Discount Code");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active Status
  const toggleCodeStatus = async (codeId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/discount-codes/${codeId}/toggle`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      fetchDiscountCodes();
    } catch (error) {
      console.error("Error toggling code status:", error);
      alert(`เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ${error.message}`);
    }
  };

  useEffect(() => {
    if (user) {
      setUserRole(sessionStorage.getItem("userRole"));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    console.log("User role:", userRole);
    if (userRole === "manager") {
      fetchDiscountCodes();
      fetchPackages();
    }
  }, [userRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== "manager") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
              <p className="text-sm text-gray-500">
                เฉพาะ Manager เท่านั้นที่สามารถเข้าถึงได้
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCodes = discountCodes.length;
  const activeCodes = discountCodes.filter((code) => code.is_active).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Manager Dashboard
          </h1>
          <p className="text-gray-600">
            จัดการ Discount Codes แบบเชื่อมกับแพคเกจ
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Code className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">รวม Codes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalCodes}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Codes ที่ใช้งานได้
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {activeCodes}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    แพคเกจทั้งหมด
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {packages.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    ส่วนลดเฉลี่ย
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalCodes > 0 
                      ? (discountCodes.reduce((sum, code) => sum + code.discount_percentage, 0) / totalCodes).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Backend Status Warning */}
        {discountCodes.length === 0 && packages.length === 0 && (
          <Card className="bg-yellow-50 border-yellow-200 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="h-4 w-4 bg-yellow-400 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    ระบบ Discount Code ยังไม่พร้อมใช้งาน
                  </p>
                  <p className="text-xs text-yellow-600">
                    กรุณาตรวจสอบว่า Backend Server ทำงานที่ port 8000
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Discount Codes Management */}
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>จัดการ Discount Codes</CardTitle>
              <CardDescription>
                สร้างโค้ดส่วนลดสำหรับแพคเกจเฉพาะหรือทุกแพคเกจ
              </CardDescription>
            </div>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  สร้าง Discount Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>สร้าง Discount Code ใหม่</DialogTitle>
                  <DialogDescription>
                    เลือกแพคเกจและส่วนลด ระบบจะสร้างโค้ดให้ Advertiser ทั้งหมดอัตโนมัติ
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="package" className="text-right">
                      แพคเกจ
                    </Label>
                    <Select
                      value={createForm.package_id}
                      onValueChange={(value) =>
                        setCreateForm({ ...createForm, package_id: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="เลือกแพคเกจ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">แพคเกจทั้งหมด (ไม่มีคอมมิชชั่น)</SelectItem>
                        {packages.map((pkg) => (
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
                      value={createForm.discount_percentage}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          discount_percentage: Number(e.target.value),
                        })
                      }
                      min="1"
                      max="50"
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    onClick={handleCreateCode}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "กำลังสร้าง..." : "สร้างโค้ดทั้งหมด"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {discountCodes.length === 0 ? (
              <div className="text-center py-8">
                <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">ยังไม่มี Discount Code</p>
                <p className="text-sm text-gray-400">
                  เริ่มต้นสร้าง Discount Code แรกของคุณ
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>โค้ด</TableHead>
                    <TableHead>Advertiser</TableHead>
                    <TableHead>แพคเกจ</TableHead>
                    <TableHead>ส่วนลด</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>วันที่สร้าง</TableHead>
                    <TableHead>จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discountCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-bold">
                        {code.code}
                      </TableCell>
                      <TableCell>{code.advertiser_name || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={code.package_name === "ทุกแพคเกจ" ? "secondary" : "default"}>
                          {code.package_name}
                        </Badge>
                      </TableCell>
                      <TableCell>{code.discount_percentage}%</TableCell>
                      <TableCell>
                        <Badge
                          variant={code.is_active ? "default" : "destructive"}
                        >
                          {code.is_active ? "ใช้งานได้" : "ปิดใช้งาน"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(code.created_at).toLocaleDateString("th-TH")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleCodeStatus(code.id, code.is_active)
                          }
                        >
                          {code.is_active ? "ปิด" : "เปิด"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerDashboard;