import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { packageAPI } from "@/lib/api";
import {
  MapPin,
  Clock,
  Users,
  Star,
  Calendar,
  ArrowLeft,
  Shield,
  Check,
  Minus,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const PackageDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        console.log("id ->", id);
        const data = await packageAPI.getById(id);
        console.log("package data ->", data);
        setPackageData(data);
      } catch (error) {
        console.error("Error fetching package:", error);
        setPackageData(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPackage();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">กำลังโหลด...</div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">ไม่พบแพคเกจที่ต้องการ</h2>
            <Button onClick={() => navigate("/")}>กลับหน้าหลัก</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const discount = packageData?.originalPrice
    ? Math.round(
        ((packageData.originalPrice - packageData.price) /
          packageData.originalPrice) *
          100
      )
    : 0;
  const availableSpots = packageData?.MaxGuests
    ? packageData.MaxGuests - (packageData.currentBookings || 0)
    : 0;

  const handleBooking = async () => {
    if (!user) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        description: "คุณต้องเข้าสู่ระบบก่อนทำการจอง",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!selectedDate) {
      toast({
        title: "กรุณาเลือกวันที่",
        description: "โปรดเลือกวันที่เดินทาง",
        variant: "destructive",
      });
      return;
    }

    if (guestCount > availableSpots) {
      toast({
        title: "จำนวนคนเกินที่สามารถจองได้",
        description: `สามารถจองได้สูงสุด ${availableSpots} ท่าน`,
        variant: "destructive",
      });
      return;
    }

    setBookingLoading(true);
    try {
      const totalAmount = packageData.price * guestCount;
      const discountAmount = packageData.discount_percentage
        ? (totalAmount * packageData.discount_percentage) / 100
        : 0;
      const finalAmount = totalAmount - discountAmount;

      // Call backend API for booking instead of Supabase function
      const response = await fetch("http://localhost:8080/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: packageData.id,
          guestCount,
          bookingDate: selectedDate,
          totalAmount,
          finalAmount,
        }),
      });

      if (!response.ok) {
        throw new Error(`Booking failed: ${response.status}`);
      }

      const data = await response.json();

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, "_blank");

        toast({
          title: "กำลังเปิดหน้าชำระเงิน",
          description: "จะเปิดหน้าต่างใหม่สำหรับชำระเงิน",
        });
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างการจองได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับหน้าหลัก
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image */}
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={packageData.image_url}
                alt={packageData.title}
                className="w-full h-96 object-cover"
              />
              {discount > 0 && (
                <Badge className="absolute top-4 left-4 bg-secondary text-secondary-foreground font-semibold text-base px-4 py-2">
                  ลด {discount}%
                </Badge>
              )}
              <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm rounded-full px-3 py-2 flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{packageData.rating}</span>
                <span className="text-muted-foreground">
                  ({packageData.review_count})
                </span>
              </div>
            </div>

            {/* Package Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {packageData.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{packageData.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{packageData.duration} วัน</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>วันที่เดินทาง</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>ติดต่อสอบถาม</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(() => {
                  // Handle tags as string or array
                  let tagsArray: string[] = [];
                  if (
                    typeof packageData.tags === "string" &&
                    packageData.tags.trim()
                  ) {
                    // If tags is a comma-separated string, split it
                    tagsArray = packageData.tags
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter((tag) => tag);
                  } else if (Array.isArray(packageData.tags)) {
                    // If tags is already an array
                    tagsArray = packageData.tags;
                  }

                  return tagsArray.map((tag, index) => (
                    <Badge
                      key={`${tag}-${index}`}
                      variant="secondary"
                      className="text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() =>
                        navigate(`/packages?tag=${encodeURIComponent(tag)}`)
                      }
                    >
                      {tag}
                    </Badge>
                  ));
                })()}
              </div>

              <Separator />

              <div>
                <h2 className="text-xl font-bold mb-3">รายละเอียดทริป</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {packageData.description}
                </p>
              </div>

              <Separator />

              <div>
                <h2 className="text-xl font-bold mb-4">
                  สิ่งที่รวมอยู่ในแพคเกจ
                </h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    "ที่พักตามโปรแกรม",
                    "อาหารตามโปรแกรม",
                    "รถโค้ชปรับอากาศ",
                    "ไกด์ท้องถิ่น",
                    "ประกันการเดินทาง",
                    "ค่าเข้าสถานที่ท่องเที่ยว",
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-primary">
                      ฿{packageData.price.toLocaleString()}
                    </span>
                    {packageData.originalPrice && (
                      <span className="text-lg text-muted-foreground line-through">
                        ฿{packageData.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">ต่อท่าน</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div className="space-y-2">
                  <Label htmlFor="date">วันที่เดินทาง</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    max={packageData.available_to || undefined}
                    required
                  />
                </div>

                {/* Guest Count Selection */}
                <div className="space-y-2">
                  <Label>จำนวนผู้เดินทาง</Label>
                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <span className="text-sm">ผู้เดินทาง</span>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setGuestCount(Math.max(1, guestCount - 1))
                        }
                        disabled={guestCount <= 1}
                        className="h-8 w-8"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-medium text-lg w-8 text-center">
                        {guestCount}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setGuestCount(
                            Math.min(availableSpots, guestCount + 1)
                          )
                        }
                        disabled={guestCount >= availableSpots}
                        className="h-8 w-8"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ที่ว่างเหลือ: {availableSpots} ท่าน
                  </p>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>ราคาต่อคน:</span>
                    <span>฿{packageData.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>จำนวนผู้เดินทาง:</span>
                    <span>{guestCount} ท่าน</span>
                  </div>
                  {packageData.discount_percentage > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>ส่วนลด ({packageData.discount_percentage}%):</span>
                      <span>
                        -฿
                        {(
                          (packageData.price *
                            guestCount *
                            packageData.discount_percentage) /
                          100
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>ราคารวม:</span>
                    <span>
                      ฿
                      {(
                        packageData.price *
                        guestCount *
                        (1 - (packageData.discount_percentage || 0) / 100)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBooking}
                  disabled={
                    bookingLoading || availableSpots === 0 || !selectedDate
                  }
                >
                  {bookingLoading
                    ? "กำลังดำเนินการ..."
                    : availableSpots === 0
                    ? "จองเต็มแล้ว"
                    : "จองเลย"}
                </Button>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>การันตีความปลอดภัยในการชำระเงิน</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageDetails;
