import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { packageAPI, bookingAPI } from "@/lib/api";
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
import { useLanguage } from "@/contexts/LanguageContext";

const PackageDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [useProfileData, setUseProfileData] = useState(false);

  // Discount code states
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    valid: boolean;
    type: string;
    discount_value: number;
    discount_type: "percentage" | "fixed";
    discount_code_id?: string;
    global_code_id?: string;
    advertiser_id?: string;
  } | null>(null);
  const [discountValidating, setDiscountValidating] = useState(false);

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  // Validate discount code
  const validateDiscountCode = async () => {
    if (!discountCode.trim()) {
      setAppliedDiscount(null);
      return;
    }

    setDiscountValidating(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/discount-codes/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: discountCode.trim(),
            package_id: packageData?.id,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.valid) {
        setAppliedDiscount(data);
        toast({
          title: t("packageDetails.discountCodeValid"),
          description: `ลด ${
            data.discount_type === "percentage"
              ? `${data.discount_value}%`
              : `฿${data.discount_value}`
          } - ${
            data.type === "advertiser"
              ? t("packageDetails.codeFromAdvertiser")
              : t("packageDetails.codeForEveryone")
          }`,
        });
      } else {
        setAppliedDiscount(null);
        toast({
          title: t("packageDetails.invalidDiscountCode"),
          description: data.error || t("packageDetails.pleaseCheckCode"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error validating discount code:", error);
      setAppliedDiscount(null);
      toast({
        title: t("packageDetails.error"),
        description: t("packageDetails.cannotVerifyCode"),
        variant: "destructive",
      });
    } finally {
      setDiscountValidating(false);
    }
  };

  // Clear discount when code is removed
  useEffect(() => {
    if (!discountCode.trim()) {
      setAppliedDiscount(null);
    }
  }, [discountCode]);

  // Auto-fill contact info when profile data checkbox is toggled
  useEffect(() => {
    console.log("🔍 useProfileData changed:", useProfileData);
    console.log("🔍 user object:", user);
    console.log("🔍 user.name:", user?.name);
    console.log("🔍 user.display_name:", user?.display_name);
    console.log("🔍 user.phone:", user?.phone);
    console.log("🔍 user.email:", user?.email);

    if (useProfileData && user) {
      setContactName(user.display_name || user.name || "");
      setContactPhone(user.phone || "");
      setContactEmail(user.email || "");
    } else if (!useProfileData) {
      // Clear fields only when explicitly unchecked, not on initial load
      if (contactName || contactPhone || contactEmail) {
        setContactName("");
        setContactPhone("");
        setContactEmail("");
      }
    }
  }, [useProfileData, user]);

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        console.log("id ->", id);
        const data = await packageAPI.getById(id);
        console.log("package data ->", data);

        // Apply discount if exists
        const hasDiscount =
          data.discount_percentage && data.discount_percentage > 0;
        const originalPrice = data.price; // ราคาเต็ม
        const discountedPrice = hasDiscount
          ? data.price * (1 - data.discount_percentage / 100)
          : data.price;

        setPackageData({
          ...data,
          originalPrice: originalPrice,
          finalPrice: discountedPrice, // ราคาหลังส่วนลด
        });
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

  const discount = packageData?.discount_percentage || 0;
  const availableSpots = packageData?.max_guests
    ? packageData.max_guests - (packageData.current_bookings || 0)
    : 0;

  // Calculate discount amount for display
  const discountAmount = appliedDiscount
    ? appliedDiscount.discount_type === "percentage"
      ? ((packageData.finalPrice || packageData.price) *
          guestCount *
          appliedDiscount.discount_value) /
        100
      : appliedDiscount.discount_value
    : 0;

  const handleCLG = async () => {
    console.log("bookingLoading  ->", bookingLoading);
    console.log("availableSpots  ->", availableSpots);
    console.log("contactName  ->", contactName);
    console.log("contactPhone  ->", contactPhone);
    console.log("contactEmail  ->", contactEmail);
  };

  const handleBooking = async () => {
    if (!user) {
      toast({
        title: t("packageDetails.loginTitle"),
        description: t("packageDetails.loginRequired"),
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Validate contact information
    if (!contactName.trim() || !contactPhone.trim() || !contactEmail.trim()) {
      toast({
        title: t("packageDetails.fillContactInfo"),
        description: t("packageDetails.fillContactDesc"),
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      toast({
        title: t("packageDetails.invalidEmail"),
        description: t("packageDetails.pleaseEnterValidEmail"),
        variant: "destructive",
      });
      return;
    }

    if (guestCount > availableSpots) {
      toast({
        title: t("packageDetails.guestLimitExceeded"),
        description: `สามารถจองได้สูงสุด ${availableSpots} ท่าน`,
        variant: "destructive",
      });
      return;
    }

    setBookingLoading(true);
    try {
      let totalAmount =
        (packageData.finalPrice || packageData.price) * guestCount;
      let discountAmount = 0;

      // Add package discount
      if (packageData.discount_percentage) {
        discountAmount += (totalAmount * packageData.discount_percentage) / 100;
      }

      // Add discount code discount
      if (appliedDiscount) {
        if (appliedDiscount.discount_type === "percentage") {
          discountAmount +=
            (totalAmount * appliedDiscount.discount_value) / 100;
        } else {
          // fixed
          discountAmount += appliedDiscount.discount_value;
        }
      }

      const finalAmount = totalAmount - discountAmount;

      // Call backend API for booking payment
      const bookingData: any = {
        packageId: packageData.id,
        guestCount,
        totalAmount,
        finalAmount,
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        special_requests: specialRequests || null,
      };

      // Add discount code info if applied
      if (appliedDiscount) {
        if (appliedDiscount.type === "advertiser") {
          bookingData.discount_code_id = appliedDiscount.discount_code_id;
        } else {
          bookingData.global_code_id = appliedDiscount.global_code_id;
        }
      }

      const data = await bookingAPI.createPayment(bookingData);

      if (data?.url) {
        // Update current_bookings
        try {
          await packageAPI.updateCurrentBookings(packageData.id, guestCount);
          const updatedPackage = await packageAPI.getById(packageData.id);
          setPackageData(updatedPackage);
        } catch (updateError) {
          console.error("Error updating current bookings:", updateError);
        }

        if (data.mock_mode) {
          // Mock payment mode - redirect directly to success page
          toast({
            title: t("packageDetails.paymentSuccess"),
            description: t("packageDetails.bookingComplete"),
          });

          // เตรียมข้อมูลที่จะส่งไปหน้า PaymentSuccess
          const bookingData = {
            title: packageData.title,
            guests: guestCount.toString(),
            amount: finalAmount.toString(),
            contact_name: contactName,
            contact_phone: contactPhone,
            contact_email: contactEmail,
            package_id: packageData.id,
            booking_id: data.booking_id,
          };

          // Redirect to success page with state data
          setTimeout(() => {
            const successUrl = data.url.replace(window.location.origin, "");
            navigate(successUrl, {
              state: { bookingData },
              replace: true,
            });
          }, 1500);
        } else {
          // Real Stripe checkout - open in new tab
          window.open(data.url, "_blank");

          toast({
            title: t("packageDetails.openingPayment"),
            description: t("packageDetails.openNewWindow"),
          });
        }
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast({
        title: t("packageDetails.error"),
        description: t("packageDetails.bookingFailed"),
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
                  {packageData.available_from && packageData.available_to && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(packageData.available_from), "dd MMM")}{" "}
                        -{" "}
                        {format(
                          new Date(packageData.available_to),
                          "dd MMM yyyy"
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>เหลือที่ว่าง {availableSpots} ท่าน</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(() => {
                  let tagsArray: string[] = [];
                  if (
                    typeof packageData.tags === "string" &&
                    packageData.tags.trim()
                  ) {
                    tagsArray = packageData.tags
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter((tag) => tag);
                  } else if (Array.isArray(packageData.tags)) {
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
                    t("details.accommodation"),
                    t("details.meals"),
                    t("details.transport"),
                    t("details.guide"),
                    t("details.insurance"),
                    t("details.entrance"),
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
                      ฿
                      {(
                        packageData.finalPrice || packageData.price
                      ).toLocaleString()}
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
                {/* Contact Information Section */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">ข้อมูลติดต่อ</h3>
                    {user && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useProfile"
                          checked={useProfileData}
                          onCheckedChange={(checked) => {
                            setUseProfileData(checked as boolean);
                          }}
                        />
                        <Label
                          htmlFor="useProfile"
                          className="text-sm cursor-pointer"
                        >
                          ใช้ข้อมูลจากโปรไฟล์
                        </Label>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactName">ชื่อ-นามสกุล *</Label>
                    <Input
                      id="contactName"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder={t("details.fullName")}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">เบอร์โทรศัพท์ *</Label>
                    <Input
                      id="contactPhone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder={t("details.phone")}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">อีเมล *</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder={t("details.email")}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialRequests">หมายเหตุพิเศษ</Label>
                    <Textarea
                      id="specialRequests"
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder={t("details.specialRequests")}
                      className="resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Discount Code Input */}
                  <div className="space-y-2">
                    <Label htmlFor="discountCode">โค้ดส่วนลด (ถ้ามี)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="discountCode"
                        value={discountCode}
                        onChange={(e) =>
                          setDiscountCode(e.target.value.toUpperCase())
                        }
                        placeholder={t("packageDetails.enterDiscountCode")}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={validateDiscountCode}
                        disabled={discountValidating || !discountCode.trim()}
                      >
                        {discountValidating
                          ? t("packageDetails.validating")
                          : t("packageDetails.useCode")}
                      </Button>
                    </div>
                    {appliedDiscount && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        <span>
                          ใช้โค้ดส่วนลด{" "}
                          {appliedDiscount.discount_type === "percentage"
                            ? `${appliedDiscount.discount_value}%`
                            : `฿${appliedDiscount.discount_value}`}{" "}
                          สำเร็จ
                          {appliedDiscount.type === "advertiser"
                            ? " (จาก Advertiser)"
                            : " (โค้ดทั่วไป)"}
                        </span>
                      </div>
                    )}
                  </div>
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
                    <span>
                      ฿
                      {(
                        packageData.finalPrice || packageData.price
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>จำนวนผู้เดินทาง:</span>
                    <span>{guestCount} ท่าน</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>ราคาก่อนลด:</span>
                    <span>
                      ฿
                      {(
                        (packageData.finalPrice || packageData.price) *
                        guestCount
                      ).toLocaleString()}
                    </span>
                  </div>
                  {packageData.discount_percentage > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>
                        ส่วนลดจากแพ็กเกจ ({packageData.discount_percentage}%):
                      </span>
                      <span>
                        -฿
                        {(
                          packageData.originalPrice * guestCount -
                          (packageData.finalPrice || packageData.price) *
                            guestCount
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {appliedDiscount && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>
                        ส่วนลดจากโค้ด (
                        {appliedDiscount.discount_type === "percentage"
                          ? `${appliedDiscount.discount_value}%`
                          : t("packageDetails.fixedDiscount")}
                        ):
                      </span>
                      <span>-฿{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>ราคารวม:</span>
                    <span>
                      ฿
                      {(() => {
                        let finalPrice =
                          (packageData.finalPrice || packageData.price) *
                          guestCount;
                        if (appliedDiscount) {
                          if (appliedDiscount.discount_type === "percentage") {
                            finalPrice =
                              finalPrice *
                              (1 - appliedDiscount.discount_value / 100);
                          } else {
                            finalPrice =
                              finalPrice - appliedDiscount.discount_value;
                          }
                        }
                        return finalPrice.toLocaleString();
                      })()}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBooking}
                  // disabled={
                  //   bookingLoading ||
                  //   availableSpots === 0 ||
                  //   !contactName ||
                  //   !contactPhone ||
                  //   !contactEmail
                  // }
                >
                  {bookingLoading
                    ? t("packageDetails.processing")
                    : availableSpots === 0
                    ? t("packageDetails.fullyBooked")
                    : t("packageDetails.bookNowTest")}
                </Button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">โหมดทดสอบ (Demo)</span>
                  </div>
                  <p className="mt-1 text-xs">
                    นี่คือการจองแบบทดสอบ ไม่มีการเรียกเก็บเงินจริง
                  </p>
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
