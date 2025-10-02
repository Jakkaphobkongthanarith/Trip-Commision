import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Users, Star, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface TravelPackage {
  id: string;
  title: string;
  description?: string;
  image?: string;
  image_url?: string;
  price: number;
  originalPrice?: number;
  discount_percentage?: number;
  duration: number | string;
  location: string;
  max_guests?: number;
  current_bookings?: number;
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  review_count?: number;
  date?: string;
  available_from?: string;
  available_to?: string;
}

interface TravelPackageCardProps {
  package: TravelPackage;
  onTagClick?: (tag: string) => void;
}

const TravelPackageCard: React.FC<TravelPackageCardProps> = ({
  package: pkg,
  onTagClick,
}) => {
  const navigate = useNavigate();

  // คำนวณราคาส่วนลดอย่างถูกต้อง
  const discountPercentage = pkg.discount_percentage || 0;
  const originalPrice = pkg.price; // ราคาเต็ม
  const discountedPrice =
    discountPercentage > 0
      ? pkg.price * (1 - discountPercentage / 100)
      : pkg.price;
  const hasDiscount = discountPercentage > 0;

  console.log("pkg.max_guests", pkg.max_guests);
  const availableSpots = pkg.max_guests
    ? pkg.max_guests - (pkg.current_bookings || 0)
    : 99;

  return (
    <Card className="group overflow-hidden bg-card border border-border/50 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
      <div
        className="relative overflow-hidden cursor-pointer"
        onClick={() => navigate(`/packages/${pkg.id}`)}
      >
        <img
          src={pkg.image_url || pkg.image}
          alt={pkg.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {hasDiscount && (
          <Badge className="absolute top-3 left-3 bg-secondary text-secondary-foreground font-semibold">
            ลด {discountPercentage.toFixed(0)}%
          </Badge>
        )}
      </div>

      <CardHeader className="pb-3">
        <h3 className="font-bold text-lg text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {pkg.title}
        </h3>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{pkg.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              {typeof pkg.duration === "number"
                ? `${pkg.duration} วัน`
                : pkg.duration}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm line-clamp-2">
          {pkg.description}
        </p>

        <div className="flex flex-wrap gap-1">
          {/* Handle tags as string or array */}
          {(() => {
            let tagsArray: string[] = [];
            if (typeof pkg.tags === "string" && (pkg.tags as string).trim()) {
              // If tags is a comma-separated string, split it
              tagsArray = (pkg.tags as string)
                .split(",")
                .map((tag) => tag.trim())
                .filter((tag) => tag);
            } else if (Array.isArray(pkg.tags)) {
              // If tags is already an array
              tagsArray = pkg.tags;
            }

            const displayTags = tagsArray.slice(0, 3);
            const remainingCount = tagsArray.length - 3;

            return (
              <>
                {displayTags.map((tag, index) => (
                  <Badge
                    key={`${tag}-${index}`}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => onTagClick?.(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
                {remainingCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    +{remainingCount}
                  </Badge>
                )}
              </>
            );
          })()}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>เหลือ {availableSpots} ที่นั่ง</span>
          </div>
          {pkg.available_from && pkg.available_to && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">
                {format(new Date(pkg.available_from), "dd MMM")} -{" "}
                {format(new Date(pkg.available_to), "dd MMM")}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">
            ฿{discountedPrice.toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              ฿{originalPrice.toLocaleString()}
            </span>
          )}
        </div>

        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg group-hover:shadow-xl transition-shadow"
          disabled={availableSpots === 0}
          onClick={() => navigate(`/packages/${pkg.id}`)}
        >
          {availableSpots > 0 ? "ดูรายละเอียด" : "เต็มแล้ว"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TravelPackageCard;
