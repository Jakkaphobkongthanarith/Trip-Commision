import { useState, useEffect } from "react";
import { discountCodeAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit, ToggleLeft, ToggleRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Package {
  id: string;
  title: string;
  location: string;
  price: number;
}

interface Advertiser {
  id: string;
  email: string;
  display_name: string;
}

interface GlobalDiscountCode {
  id: string;
  code: string;
  discount_value: number;
  discount_type: "percentage" | "fixed";
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

interface DiscountCode {
  id: string;
  code: string;
  discount_value: number;
  discount_type: "percentage" | "fixed";
  commission_rate?: number; // Optional เนื่องจากคำนวณอัตโนมัติ
  is_active: boolean;
  package_id: string;
  advertiser_id: string;
  package_title?: string;
  advertiser_name?: string;
  created_at: string;
}

const DiscountCodeManagement = () => {
  const { toast } = useToast();
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [globalCodes, setGlobalCodes] = useState<GlobalDiscountCode[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isGlobalDialogOpen, setIsGlobalDialogOpen] = useState(false);

  // Form state สำหรับสร้างโค้ดใหม่
  const [newCode, setNewCode] = useState({
    package_id: "",
    advertiser_id: "",
    discount_value: 0,
    discount_type: "percentage" as "percentage" | "fixed",
  });

  // Form state สำหรับสร้างโค้ดทั่วไป
  const [newGlobalCode, setNewGlobalCode] = useState({
    discount_value: 10,
    discount_type: "percentage" as "percentage" | "fixed",
  });

  // โหลดข้อมูลเริ่มต้น
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [codesRes, globalCodesRes, packagesRes, advertisersRes] =
        await Promise.all([
          discountCodeAPI.getAllDiscountCodes(),
          discountCodeAPI.getAllGlobalCodes(),
          discountCodeAPI.getAllPackages(),
          discountCodeAPI.getAllAdvertisers(),
        ]);

      setDiscountCodes(codesRes);
      setGlobalCodes(globalCodesRes);
      setPackages(packagesRes);
      setAdvertisers(advertisersRes);

      toast({
        title: "โหลดข้อมูลสำเร็จ",
        description: "ข้อมูลโค้ดส่วนลดทั้งหมดถูกโหลดแล้ว",
      });
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscountCode = async () => {
    if (
      !newCode.package_id ||
      !newCode.advertiser_id ||
      !newCode.discount_value
    ) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกข้อมูลให้ครบถ้วน",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await discountCodeAPI.createForAdvertiser(newCode);

      toast({
        title: "สร้างโค้ดส่วนลดสำเร็จ",
        description:
          "โค้ดส่วนลดใหม่ถูกสร้างและส่งการแจ้งเตือนไปยัง Advertiser แล้ว",
      });

      // Reset form และ reload data
      setNewCode({
        package_id: "",
        advertiser_id: "",
        discount_value: 0,
        discount_type: "percentage",
      });
      setIsCreateDialogOpen(false);
      loadInitialData();
    } catch (error) {
      console.error("Error creating discount code:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างโค้ดส่วนลดได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGlobalCode = async () => {
    if (!newGlobalCode.discount_value) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกมูลค่าส่วนลด",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await discountCodeAPI.createGlobal(newGlobalCode);

      toast({
        title: "สร้างโค้ดส่วนลดทั่วไปสำเร็จ",
        description: "โค้ดส่วนลดทั่วไปใหม่ถูกสร้างแล้ว",
      });

      // Reset form และ reload data
      setNewGlobalCode({
        discount_value: 10,
        discount_type: "percentage",
      });
      setIsGlobalDialogOpen(false);
      loadInitialData();
    } catch (error) {
      console.error("Error creating global discount code:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างโค้ดส่วนลดทั่วไปได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      await discountCodeAPI.toggleStatus(id, !currentStatus);
      toast({
        title: "อัปเดตสถานะสำเร็จ",
        description: "สถานะโค้ดส่วนลดถูกเปลี่ยนแล้ว",
      });
      loadInitialData();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปลี่ยนสถานะได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGlobalStatus = async (
    id: string,
    currentStatus: boolean
  ) => {
    setLoading(true);
    try {
      await discountCodeAPI.toggleGlobalStatus(id, !currentStatus);
      toast({
        title: "อัปเดตสถานะสำเร็จ",
        description: "สถานะโค้ดส่วนลดทั่วไปถูกเปลี่ยนแล้ว",
      });
      loadInitialData();
    } catch (error) {
      console.error("Error toggling global status:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปลี่ยนสถานะได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบโค้ดส่วนลดนี้?")) return;

    setLoading(true);
    try {
      await discountCodeAPI.delete(id);
      toast({
        title: "ลบโค้ดส่วนลดสำเร็จ",
        description: "โค้ดส่วนลดถูกลบแล้ว",
      });
      loadInitialData();
    } catch (error) {
      console.error("Error deleting discount code:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบโค้ดส่วนลดได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGlobal = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบโค้ดส่วนลดทั่วไปนี้?")) return;

    setLoading(true);
    try {
      await discountCodeAPI.deleteGlobal(id);
      toast({
        title: "ลบโค้ดส่วนลดทั่วไปสำเร็จ",
        description: "โค้ดส่วนลดทั่วไปถูกลบแล้ว",
      });
      loadInitialData();
    } catch (error) {
      console.error("Error deleting global discount code:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบโค้ดส่วนลดทั่วไปได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPackageName = (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    return pkg?.title || "ไม่พบแพ็กเกจ";
  };

  const getAdvertiserName = (advertiserId: string) => {
    const advertiser = advertisers.find((a) => a.id === advertiserId);
    return advertiser?.display_name || advertiser?.email || "ไม่พบ Advertiser";
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">จัดการโค้ดส่วนลด</h1>

        <div className="flex gap-2">
          <Dialog
            open={isGlobalDialogOpen}
            onOpenChange={setIsGlobalDialogOpen}
          >
            <DialogTrigger asChild>
              <Button disabled={loading} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                สร้างโค้ดส่วนลดทั่วไป
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>สร้างโค้ดส่วนลดทั่วไป</DialogTitle>
                <DialogDescription>
                  สร้างโค้ดส่วนลดที่ใช้ได้กับทุกแพ็กเกจ
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* ประเภทส่วนลด */}
                <div>
                  <Label htmlFor="global_discount_type">ประเภทส่วนลด</Label>
                  <Select
                    value={newGlobalCode.discount_type}
                    onValueChange={(value: "percentage" | "fixed") =>
                      setNewGlobalCode((prev) => ({
                        ...prev,
                        discount_type: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        เปอร์เซ็นต์ (%)
                      </SelectItem>
                      <SelectItem value="fixed">จำนวนเงิน (บาท)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* มูลค่าส่วนลด */}
                <div>
                  <Label htmlFor="global_discount_value">
                    มูลค่าส่วนลด{" "}
                    {newGlobalCode.discount_type === "percentage"
                      ? "(%)"
                      : "(บาท)"}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={
                      newGlobalCode.discount_type === "percentage"
                        ? "100"
                        : undefined
                    }
                    value={newGlobalCode.discount_value}
                    onChange={(e) =>
                      setNewGlobalCode((prev) => ({
                        ...prev,
                        discount_value: Number(e.target.value),
                      }))
                    }
                    placeholder={
                      newGlobalCode.discount_type === "percentage"
                        ? "0-100"
                        : "จำนวนเงิน"
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsGlobalDialogOpen(false)}
                  >
                    ยกเลิก
                  </Button>
                  <Button onClick={handleCreateGlobalCode} disabled={loading}>
                    สร้างโค้ดส่วนลด
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                สร้างโค้ดสำหรับ Advertiser
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>สร้างโค้ดส่วนลดใหม่</DialogTitle>
                <DialogDescription>
                  เลือกแพ็กเกจและ Advertiser เพื่อสร้างโค้ดส่วนลด
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* เลือกแพ็กเกจ */}
                <div>
                  <Label htmlFor="package">แพ็กเกจ</Label>
                  <Select
                    value={newCode.package_id}
                    onValueChange={(value) =>
                      setNewCode((prev) => ({ ...prev, package_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกแพ็กเกจ" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.title} - {pkg.location} (฿
                          {pkg.price?.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* เลือก Advertiser */}
                <div>
                  <Label htmlFor="advertiser">Advertiser</Label>
                  <Select
                    value={newCode.advertiser_id}
                    onValueChange={(value) =>
                      setNewCode((prev) => ({ ...prev, advertiser_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก Advertiser" />
                    </SelectTrigger>
                    <SelectContent>
                      {advertisers.map((advertiser) => (
                        <SelectItem key={advertiser.id} value={advertiser.id}>
                          {advertiser.display_name || advertiser.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ประเภทส่วนลด */}
                <div>
                  <Label htmlFor="discount_type">ประเภทส่วนลด</Label>
                  <Select
                    value={newCode.discount_type}
                    onValueChange={(value: "percentage" | "fixed") =>
                      setNewCode((prev) => ({ ...prev, discount_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        เปอร์เซ็นต์ (%)
                      </SelectItem>
                      <SelectItem value="fixed">จำนวนเงิน (บาท)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* มูลค่าส่วนลด */}
                <div>
                  <Label htmlFor="discount_value">
                    มูลค่าส่วนลด{" "}
                    {newCode.discount_type === "percentage" ? "(%)" : "(บาท)"}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={
                      newCode.discount_type === "percentage" ? "100" : undefined
                    }
                    value={newCode.discount_value}
                    onChange={(e) =>
                      setNewCode((prev) => ({
                        ...prev,
                        discount_value: Number(e.target.value),
                      }))
                    }
                    placeholder={
                      newCode.discount_type === "percentage"
                        ? "0-100"
                        : "จำนวนเงิน"
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    ยกเลิก
                  </Button>
                  <Button onClick={handleCreateDiscountCode} disabled={loading}>
                    สร้างโค้ดส่วนลด
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>{" "}
      {/* รายการโค้ดส่วนลด */}
      <div className="space-y-6">
        {/* Global Discount Codes */}
        <div>
          <h2 className="text-xl font-semibold mb-4">โค้ดส่วนลดทั่วไป</h2>
          <div className="grid gap-4">
            {loading && globalCodes.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    กำลังโหลดข้อมูล...
                  </p>
                </CardContent>
              </Card>
            ) : globalCodes.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    ยังไม่มีโค้ดส่วนลดทั่วไป
                  </p>
                </CardContent>
              </Card>
            ) : (
              globalCodes.map((code) => (
                <Card key={code.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{code.code}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          โค้ดส่วนลดทั่วไป - ใช้ได้กับทุกแพ็กเกจ
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={code.is_active ? "default" : "secondary"}
                        >
                          {code.is_active ? "ใช้งานได้" : "ปิดการใช้งาน"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleToggleGlobalStatus(code.id, code.is_active)
                          }
                          disabled={loading}
                        >
                          {code.is_active ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteGlobal(code.id)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium">ส่วนลด</p>
                        <p className="text-muted-foreground">
                          {code.discount_type === "percentage"
                            ? `${code.discount_value}%`
                            : `฿${code.discount_value?.toLocaleString()}`}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">วันที่สร้าง</p>
                        <p className="text-muted-foreground">
                          {new Date(code.created_at).toLocaleDateString(
                            "th-TH"
                          )}
                        </p>
                      </div>
                      {code.expires_at && (
                        <div>
                          <p className="font-medium">วันหมดอายุ</p>
                          <p className="text-muted-foreground">
                            {new Date(code.expires_at).toLocaleDateString(
                              "th-TH"
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Advertiser Discount Codes */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            โค้ดส่วนลดสำหรับ Advertiser
          </h2>
          <div className="grid gap-4">
            {loading && discountCodes.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    กำลังโหลดข้อมูล...
                  </p>
                </CardContent>
              </Card>
            ) : discountCodes.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    ยังไม่มีโค้ดส่วนลด
                  </p>
                </CardContent>
              </Card>
            ) : (
              discountCodes.map((code) => (
                <Card key={code.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{code.code}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          แพ็กเกจ: {getPackageName(code.package_id)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Advertiser: {getAdvertiserName(code.advertiser_id)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={code.is_active ? "default" : "secondary"}
                        >
                          {code.is_active ? "ใช้งานได้" : "ปิดการใช้งาน"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleToggleStatus(code.id, code.is_active)
                          }
                          disabled={loading}
                        >
                          {code.is_active ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(code.id)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium">ส่วนลด</p>
                        <p className="text-muted-foreground">
                          {code.discount_type === "percentage"
                            ? `${code.discount_value}%`
                            : `฿${code.discount_value?.toLocaleString()}`}
                        </p>
                      </div>
                      {code.commission_rate && (
                        <div>
                          <p className="font-medium">ค่าคอมมิชชั่น</p>
                          <p className="text-muted-foreground">
                            {code.commission_rate}%
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">วันที่สร้าง</p>
                        <p className="text-muted-foreground">
                          {new Date(code.created_at).toLocaleDateString(
                            "th-TH"
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountCodeManagement;
