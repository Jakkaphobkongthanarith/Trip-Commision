import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Users, Star } from "lucide-react";

interface TravelPackage {
  id: string;
  title: string;
  description: string;
  image: string;
  price: number;
  originalPrice?: number;
  duration: string;
  location: string;
  maxPeople: number;
  currentBookings: number;
  tags: string[];
  rating: number;
  reviewCount: number;
  date: string;
}

interface TravelPackageCardProps {
  package: TravelPackage;
}

const TravelPackageCard: React.FC<TravelPackageCardProps> = ({ package: pkg }) => {
  const discount = pkg.originalPrice ? Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100) : 0;
  const availableSpots = pkg.maxPeople - pkg.currentBookings;
  
  return (
    <Card className="group overflow-hidden bg-card border border-border/50 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
      <div className="relative overflow-hidden">
        <img
          src={pkg.image}
          alt={pkg.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {discount > 0 && (
          <Badge className="absolute top-3 left-3 bg-secondary text-secondary-foreground font-semibold">
            ลด {discount}%
          </Badge>
        )}
        <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 text-sm">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="font-medium">{pkg.rating}</span>
          <span className="text-muted-foreground">({pkg.reviewCount})</span>
        </div>
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
            <span>{pkg.duration}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm line-clamp-2">
          {pkg.description}
        </p>
        
        <div className="flex flex-wrap gap-1">
          {pkg.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {pkg.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{pkg.tags.length - 3}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>เหลือ {availableSpots} ที่นั่ง</span>
          </div>
          <span className="text-muted-foreground">วันที่: {pkg.date}</span>
        </div>
      </CardContent>
      
      <CardFooter className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">
            ฿{pkg.price.toLocaleString()}
          </span>
          {pkg.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              ฿{pkg.originalPrice.toLocaleString()}
            </span>
          )}
        </div>
        
        <Button 
          size="sm" 
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg group-hover:shadow-xl transition-shadow"
          disabled={availableSpots === 0}
        >
          {availableSpots > 0 ? "จองทันที" : "เต็มแล้ว"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TravelPackageCard;