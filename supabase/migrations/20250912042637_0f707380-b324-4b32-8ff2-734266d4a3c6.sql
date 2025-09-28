-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('customer', 'advertiser', 'manager');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create travel_packages table
CREATE TABLE public.travel_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL, -- days
  location TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discount_codes table
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  advertiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.travel_packages(id) ON DELETE CASCADE,
  discount_code_id UUID REFERENCES public.discount_codes(id),
  total_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  booking_date DATE NOT NULL,
  guest_count INTEGER NOT NULL DEFAULT 1,
  special_requests TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create commissions table
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  advertiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commission_amount DECIMAL(10,2) NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS app_role AS $$
  SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role AS $$
  SELECT public.get_user_role(auth.uid());
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only managers can manage roles" ON public.user_roles
  FOR ALL USING (public.get_current_user_role() = 'manager');

-- RLS Policies for travel_packages
CREATE POLICY "Everyone can view active packages" ON public.travel_packages
  FOR SELECT USING (is_active = true OR public.get_current_user_role() = 'manager');

CREATE POLICY "Only managers can manage packages" ON public.travel_packages
  FOR ALL USING (public.get_current_user_role() = 'manager');

-- RLS Policies for discount_codes
CREATE POLICY "Advertisers can view their own codes" ON public.discount_codes
  FOR SELECT USING (auth.uid() = advertiser_id OR public.get_current_user_role() IN ('manager'));

CREATE POLICY "Advertisers can manage their own codes" ON public.discount_codes
  FOR ALL USING (auth.uid() = advertiser_id OR public.get_current_user_role() = 'manager');

-- RLS Policies for bookings
CREATE POLICY "Customers can view their own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = customer_id OR public.get_current_user_role() = 'manager');

CREATE POLICY "Customers can create their own bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = customer_id OR public.get_current_user_role() = 'manager');

-- RLS Policies for commissions
CREATE POLICY "Advertisers can view their own commissions" ON public.commissions
  FOR SELECT USING (auth.uid() = advertiser_id OR public.get_current_user_role() = 'manager');

CREATE POLICY "Only managers can manage commissions" ON public.commissions
  FOR ALL USING (public.get_current_user_role() = 'manager');

-- Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_travel_packages_updated_at BEFORE UPDATE ON public.travel_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON public.discount_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial travel packages data
INSERT INTO public.travel_packages (title, description, image_url, price, duration, location, tags, rating, review_count) VALUES
('ทริปภูเขาสวยงาม', 'สัมผัสธรรมชาติสุดประทับใจบนภูเขาที่สวยงาม พร้อมกิจกรรมเดินป่าและชมวิวพระอาทิตย์ขึ้น', '/src/assets/mountain-package.jpg', 12000.00, 3, 'เชียงใหม่', ARRAY['ธรรมชาติ', 'ผจญภัย', 'ภูเขา'], 4.8, 156),
('ชายหาดสุดแสนโรแมนติก', 'พักผ่อนริมชายหาดสีขาวสะอาด น้ำทะเลใสใสเป็นธรรมชาติ พร้อมกิจกรรมดำน้ำดูปะการัง', '/src/assets/beach-package.jpg', 8500.00, 2, 'เกาะสมุย', ARRAY['ชายหาด', 'ผ่อนคลาย', 'ดำน้ำ'], 4.9, 203),
('ตลาดดำเนิฟไกนสะดวก', 'สัมผัสวิถีชีวิตแบบไทยๆ เยี่ยมชมตลาดน้ำโบราณ ลิ้มรสอาหารพื้นบ้าน', '/src/assets/market-package.jpg', 3500.00, 1, 'ราชบุรี', ARRAY['วัฒนธรรม', 'อาหาร', 'ตลาดน้ำ'], 4.6, 89),
('อยุธยามหาอำนาจ', 'เยี่ยมชมแหล่งมรดกโลกอยุธยา สำรวจประวัติศาสตร์ไทยผ่านซากปราสาทโบราณ', '/src/assets/ayutthaya-package.jpg', 4200.00, 1, 'อยุธยา', ARRAY['ประวัติศาสตร์', 'วัฒนธรรม', 'มรดกโลก'], 4.7, 124);