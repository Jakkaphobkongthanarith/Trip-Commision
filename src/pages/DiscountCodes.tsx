import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Search, Gift, Tag } from "lucide-react";
import Navbar from "@/components/Navbar";

interface GlobalDiscountCode {
  id: string;
  code: string;
  discount_value: number;
  discount_type: "percentage" | "fixed";
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function DiscountCodesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [globalCodes, setGlobalCodes] = useState<GlobalDiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchGlobalDiscountCodes = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/manager/global-discount-codes`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch discount codes");
      }

      const data = await response.json();
      const sortedCodes = data
        .filter((code: GlobalDiscountCode) => code.is_active)
        .sort(
          (a: GlobalDiscountCode, b: GlobalDiscountCode) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      setGlobalCodes(sortedCodes);
    } catch (error) {
      console.error("Error fetching discount codes:", error);
      setGlobalCodes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalDiscountCodes();
  }, []);

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "คัดลอกเรียบร้อย",
        description: `คัดลอกโค้ด ${code} แล้ว`,
      });
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถคัดลอกโค้ดได้",
        variant: "destructive",
      });
    }
  };

  const filteredCodes = globalCodes.filter((code) =>
    code.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isCodeUsable = (code: GlobalDiscountCode) => {
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return false;
    }

    if (code.max_uses && code.current_uses >= code.max_uses) {
      return false;
    }

    return code.is_active;
  };

  const getCodeStatus = (code: GlobalDiscountCode) => {
    if (!code.is_active) {
      return {
        text: "ปิดใช้งาน",
        color: "bg-red-100 text-red-800 border-red-300",
      };
    }

    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return {
        text: "หมดอายุ",
        color: "bg-orange-100 text-orange-800 border-orange-300",
      };
    }

    if (code.max_uses && code.current_uses >= code.max_uses) {
      return {
        text: "ใช้ครบแล้ว",
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      };
    }

    return {
      text: "ใช้งานได้",
      color: "bg-green-100 text-green-800 border-green-300",
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <div className="container mx-auto px-6 pt-16 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Gift className="h-12 w-12 text-primary mr-3" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                โค้ดส่วนลดพิเศษ
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ค้นหาและใช้โค้ดส่วนลดพิเศษสำหรับการจองแพ็กเกจทุกประเภท
              ประหยัดได้มากขึ้นกับโค้ดส่วนลดที่อัปเดตใหม่ทุกวัน
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="ค้นหาโค้ดส่วนลด..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">กำลังโหลดโค้ดส่วนลด...</p>
            </div>
          )}

          {/* No codes available */}
          {!loading && globalCodes.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Tag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  ยังไม่มีโค้ดส่วนลด
                </h3>
                <p className="text-muted-foreground">
                  ขณะนี้ยังไม่มีโค้ดส่วนลดที่พร้อมใช้งาน
                  กรุณาลองใหม่อีกครั้งในภายหลัง
                </p>
              </CardContent>
            </Card>
          )}

          {/* No search results */}
          {!loading &&
            globalCodes.length > 0 &&
            filteredCodes.length === 0 &&
            searchTerm && (
              <Card className="text-center py-12">
                <CardContent>
                  <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    ไม่พบโค้ดส่วนลดที่ค้นหา
                  </h3>
                  <p className="text-muted-foreground">
                    ลองใช้คำค้นอื่นหรือเลี่ยงการใส่คำค้น
                  </p>
                </CardContent>
              </Card>
            )}

          {/* Discount Codes Grid */}
          {!loading && filteredCodes.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCodes.map((code) => (
                <Card
                  key={code.id}
                  className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/20"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className={`${
                          code.discount_type === "percentage"
                            ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300"
                            : "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300"
                        }`}
                      >
                        {code.discount_type === "percentage"
                          ? `ลด ${code.discount_value}%`
                          : `ลด ฿${code.discount_value}`}
                      </Badge>
                      <Tag className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-lg p-4 border-2 border-dashed border-primary/30">
                        <p className="text-2xl font-bold font-mono text-primary tracking-wider">
                          {code.code}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>มูลค่าส่วนลด:</span>
                        <span
                          className={`font-semibold ${
                            code.discount_type === "percentage"
                              ? "text-green-600"
                              : "text-blue-600"
                          }`}
                        >
                          {code.discount_type === "percentage"
                            ? `${code.discount_value}%`
                            : `฿${code.discount_value}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>ประเภท:</span>
                        <span className="font-medium">
                          {code.discount_type === "percentage"
                            ? "ลดเปอร์เซ็นต์"
                            : "ลดเป็นจำนวนเงิน"}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => copyToClipboard(code.code)}
                      disabled={!isCodeUsable(code)}
                      variant={isCodeUsable(code) ? "default" : "secondary"}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {isCodeUsable(code) ? "คัดลอกโค้ด" : "ไม่สามารถใช้ได้"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Usage Instructions */}
          {!loading && globalCodes.length > 0 && (
            <Card className="mt-12 border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-blue-800 flex items-center">
                  <Gift className="h-5 w-5 mr-2" />
                  วิธีใช้โค้ดส่วนลด
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-700">
                <ol className="list-decimal list-inside space-y-2">
                  <li>คัดลอกโค้ดส่วนลดที่ต้องการ</li>
                  <li>เลือกแพ็กเกจที่ต้องการจอง</li>
                  <li>กรอกโค้ดส่วนลดในช่อง "โค้ดส่วนลด" ในหน้าจอง</li>
                  <li>กดปุ่ม "ใช้โค้ด" เพื่อยืนยัน</li>
                  <li>ระบบจะคำนวณส่วนลดให้อัตโนมัติ</li>
                </ol>

                <div className="mt-4 grid md:grid-cols-2 gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <p className="text-sm font-medium text-green-800">
                      🔢 <strong>ส่วนลดเปอร์เซ็นต์:</strong>
                      <br />
                      ลดตามเปอร์เซ็นต์ของราคาทั้งหมด (เช่น ลด 10%)
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">
                      💰 <strong>ส่วนลดจำนวนเงิน:</strong>
                      <br />
                      ลดเป็นจำนวนเงินคงที่ (เช่น ลด ฿100)
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm font-medium">
                    💡 <strong>เคล็ดลับ:</strong>{" "}
                    โค้ดส่วนลดเหล่านี้ใช้ได้กับแพ็กเกจทุกประเภท
                    และสามารถใช้ร่วมกับส่วนลดของแพ็กเกจได้
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
