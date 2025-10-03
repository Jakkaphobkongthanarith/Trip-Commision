import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { bookingAPI } from "@/lib/api";
import {
  CheckCircle,
  Clock,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  ArrowLeft,
} from "lucide-react";

const PaymentConfirmation = () => {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  // ข้อมูลจาก URL params (จาก PackageDetails)
  const packageTitle = searchParams.get("title");
  const guestCount = searchParams.get("guests");
  const totalAmount = searchParams.get("amount");
  const contactName = searchParams.get("contact_name");
  const contactPhone = searchParams.get("contact_phone");
  const contactEmail = searchParams.get("contact_email");

  const handleConfirmPayment = async () => {
    if (!bookingId) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่พบข้อมูลการจอง",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await bookingAPI.confirmPayment(bookingId);
      setPaymentConfirmed(true);

      toast({
        title: "ชำระเงินสำเร็จ!",
        description: "การจองของคุณได้รับการยืนยันแล้ว",
        variant: "default",
      });
    } catch (error) {
      console.error("Payment confirmation error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยืนยันการชำระเงินได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (paymentConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="border-green-200 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">
                การจองของคุณได้รับการชำระเงินเรียบร้อย
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  โปรดรอเจ้าหน้าที่ของทางเราติดต่อไปได้เลย!
                </h3>
                <p className="text-green-700 text-sm">
                  ทางเราจะติดต่อกลับไปตามข้อมูลที่คุณได้แจ้งไว้ภายใน 24 ชั่วโมง
                </p>
              </div>

              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">แพ็คเกจท่องเที่ยว</div>
                    <div className="text-gray-600">{packageTitle}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">จำนวนผู้เดินทาง</div>
                    <div className="text-gray-600">{guestCount} ท่าน</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">จำนวนเงินที่ชำระ</div>
                    <div className="text-gray-600">
                      ฿
                      {totalAmount
                        ? parseInt(totalAmount).toLocaleString()
                        : "0"}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">ข้อมูลติดต่อ</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">ชื่อ:</span>
                      <span>{contactName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <span>{contactPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span>{contactEmail}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/profile")}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  ดูประวัติการจอง
                </Button>
                <Button onClick={() => navigate("/")} className="flex-1">
                  กลับหน้าหลัก
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">ยืนยันการชำระเงิน</CardTitle>
            <p className="text-gray-600 mt-2">
              กรุณาตรวจสอบข้อมูลและดำเนินการชำระเงิน
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* ข้อมูลการจอง */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">ข้อมูลการจอง</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>แพ็คเกจ:</span>
                  <span className="font-medium">{packageTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span>จำนวนผู้เดินทาง:</span>
                  <span className="font-medium">{guestCount} ท่าน</span>
                </div>
                <div className="flex justify-between">
                  <span>ยอดรวม:</span>
                  <span className="font-semibold text-green-600">
                    ฿
                    {totalAmount ? parseInt(totalAmount).toLocaleString() : "0"}
                  </span>
                </div>
              </div>
            </div>

            {/* ข้อมูลติดต่อ */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">ข้อมูลติดต่อ</h3>
              <div className="space-y-2">
                <div>
                  <strong>ชื่อ:</strong> {contactName}
                </div>
                <div>
                  <strong>เบอร์โทร:</strong> {contactPhone}
                </div>
                <div>
                  <strong>อีเมล:</strong> {contactEmail}
                </div>
              </div>
            </div>

            {/* Mock Payment Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  โหมดทดสอบ (Demo)
                </span>
              </div>
              <p className="text-yellow-700 text-sm mb-4">
                นี่คือการชำระเงินแบบจำลอง ไม่มีการตัดเงินจริง
              </p>
              <Button
                onClick={handleConfirmPayment}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    กำลังดำเนินการ...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    ยืนยันการชำระเงิน (จำลอง)
                  </>
                )}
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                ย้อนกลับ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
