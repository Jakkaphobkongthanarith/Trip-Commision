import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [verificationComplete, setVerificationComplete] = useState(false);

  const bookingId = searchParams.get('booking_id');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!bookingId || !sessionId) {
        toast({
          title: "ข้อมูลไม่ครบถ้วน",
          description: "ไม่พบข้อมูลการจองหรือการชำระเงิน",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: {
            sessionId,
            bookingId,
          },
        });

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
        console.error('Payment verification error:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถตรวจสอบการชำระเงินได้",
          variant: "destructive",
        });
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
                การชำระเงินสำเร็จ!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground">กำลังตรวจสอบการชำระเงิน...</p>
                </div>
              ) : verificationComplete ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    ขอบคุณสำหรับการจอง! การจองของคุณได้รับการยืนยันแล้ว
                  </p>
                  <p className="text-sm text-muted-foreground">
                    คุณสามารถดูรายละเอียดการจองได้ในหน้าโปรไฟล์
                  </p>
                  <div className="space-y-2">
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