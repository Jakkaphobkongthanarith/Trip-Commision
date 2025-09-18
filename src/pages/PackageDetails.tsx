import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin,
  Clock,
  Users,
  Star,
  Calendar,
  ArrowLeft,
  Phone,
  Mail,
  CreditCard,
  Shield,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PackageDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState({
    fullName: "",
    email: "",
    phone: "",
    specialRequests: "",
    numberOfPeople: 1,
  });

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        const { data, error } = await supabase
          .from('travel_packages')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        setPackageData(data);
      } catch (error) {
        console.error('Error fetching package:', error);
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
  const availableSpots = packageData?.maxPeople ? packageData.maxPeople - (packageData.currentBookings || 0) : 0;

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "การจองสำเร็จ!",
      description: `คุณได้จองแพคเกจ "${packageData.title}" เรียบร้อยแล้ว`,
    });
    setShowBookingForm(false);
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
                {packageData.tags?.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => navigate(`/packages?tag=${encodeURIComponent(tag)}`)}
                  >
                    {tag}
                  </Badge>
                ))}
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

              <CardContent className="space-y-4">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowBookingForm(true)}
                >
                  จองเลย
                </Button>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
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