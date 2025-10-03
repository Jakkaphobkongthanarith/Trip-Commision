import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, CreditCard, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [verificationComplete, setVerificationComplete] = useState(false);

  const bookingId = searchParams.get("booking_id");
  const sessionId = searchParams.get("session_id");

  // รับข้อมูล state จากหน้าก่อน
  const bookingData = location.state?.bookingData || {
    title: searchParams.get("title") || "ไม่ระบุแพ็คเกจ",
    guests: searchParams.get("guests") || "1",
    amount: searchParams.get("amount") || "0",
    contact_name: searchParams.get("contact_name") || "",
    contact_phone: searchParams.get("contact_phone") || "",
    contact_email: searchParams.get("contact_email") || "",
    package_id: searchParams.get("package_id") || "",
  };

  const handleConfirmBooking = () => {
    const params = new URLSearchParams({
      title: bookingData.title,
      guests: bookingData.guests,
      amount: bookingData.amount,
      contact_name: bookingData.contact_name,
      contact_phone: bookingData.contact_phone,
      contact_email: bookingData.contact_email,
    });

    navigate(`/payment/confirm/${bookingId}?${params.toString()}`);
  };

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        toast({
          title: "ข้อมูลไม่ครบถ้วน",
          description: "ไม่พบข้อมูลการชำระเงิน",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      try {
        // Check if this is a mock payment (session_id starts with cs_test_mock_)
        if (sessionId.startsWith("cs_test_mock_")) {
          // Mock payment mode - automatically mark as successful
          setVerificationComplete(true);
          toast({
            title: "การชำระเงินสำเร็จ (โหมดทดสอบ)",
            description: "ขอบคุณสำหรับการจอง การจองของคุณได้รับการยืนยันแล้ว",
          });
          setLoading(false);
          return;
        }

        // Real Stripe payment verification
        const { data, error } = await supabase.functions.invoke(
          "verify-payment",
          {
            body: {
              sessionId,
              bookingId,
            },
          }
        );

        if (error) throw error;

        if (data?.success) {
          setVerificationComplete(true);
          toast({
            title: "การชำระเงินสำเร็จ",
            description: "ขอบคุณสำหรับการจอง การจองของคุณได้รับการยืนยันแล้ว",
          });
        } else {
          toast({
            title: "การชำระเงินไม่สำเร็จ",
            description: "การชำระเงินยังไม่เสร็จสมบูรณ์",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        // In mock mode, treat errors as success for demo purposes
        if (sessionId.startsWith("cs_test_mock_")) {
          setVerificationComplete(true);
          toast({
            title: "การชำระเงินสำเร็จ (โหมดทดสอบ)",
            description: "ขอบคุณสำหรับการจอง การจองของคุณได้รับการยืนยันแล้ว",
          });
        } else {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถตรวจสอบการชำระเงินได้",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [bookingId, sessionId, navigate, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-24">
        <div className="max-w-md mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              </div>
              <CardTitle className="text-2xl text-green-600">
                {sessionId && sessionId.startsWith("cs_test_mock_")
                  ? "การจองสำเร็จ! (โหมดทดสอบ)"
                  : "การชำระเงินสำเร็จ!"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground">
                    กำลังตรวจสอบการชำระเงิน...
                  </p>
                </div>
              ) : verificationComplete ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-green-800 mb-2">
                      รายละเอียดการจอง
                    </h3>
                    <div className="text-sm text-green-700 space-y-1">
                      <div>
                        <strong>แพ็คเกจ:</strong> {bookingData.title}
                      </div>
                      <div>
                        <strong>จำนวนผู้เดินทาง:</strong> {bookingData.guests}{" "}
                        ท่าน
                      </div>
                      <div>
                        <strong>ยอดรวม:</strong> ฿
                        {parseInt(bookingData.amount).toLocaleString()}
                      </div>
                      <div>
                        <strong>ผู้ติดต่อ:</strong> {bookingData.contact_name}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    ขอบคุณสำหรับการจอง! การจองของคุณได้รับการยืนยันแล้ว
                  </p>
                  <p className="text-sm text-muted-foreground">
                    คุณสามารถดูรายละเอียดการจองได้ในหน้าโปรไฟล์
                  </p>
                  <div className="space-y-2">
                    <div className="mt-4 pt-3 border-t">
                      <Button
                        onClick={handleConfirmBooking}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        ยืนยันการจอง (ชำระเงิน)
                      </Button>
                    </div>
                    <Button
                      onClick={() => navigate("/profile")}
                      className="w-full"
                    >
                      ดูประวัติการจอง
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/")}
                      className="w-full"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      กลับหน้าหลัก
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    การชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
                  </p>
                  <Button
                    onClick={() => navigate("/packages")}
                    className="w-full"
                  >
                    เลือกแพคเกจอื่น
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
