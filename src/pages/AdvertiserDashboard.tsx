import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Star, Calendar, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import Navbar from '@/components/Navbar';

interface Commission {
  id: string;
  booking_id: string;
  commission_amount: number;
  commission_percentage: number;
  status: string;
  created_at: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  travel_packages: {
    title: string;
  };
  profiles: {
    display_name: string;
  };
}

interface UpcomingTrip {
  id: string;
  booking_date: string;
  guest_count: number;
  status: string;
  travel_packages: {
    title: string;
    location: string;
  };
  profiles: {
    display_name: string;
  };
}

const AdvertiserDashboard = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingTrip[]>([]);
  const [monthlyCommission, setMonthlyCommission] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    const run = async () => {
      if (!user) return;
      setLoading(true);
      await Promise.allSettled([
        fetchUserRole(),
        fetchCommissions(),
        fetchReviews(),
        fetchUpcomingTrips(),
      ]);
      if (!isCancelled) setLoading(false);
    };
    run();
    return () => { isCancelled = true; };
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      const { data: roleData, error: roleError } = await supabase.rpc('get_current_user_role');
      if (!roleError && roleData) {
        setUserRole(roleData as string);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data?.role) {
        setUserRole(data.role as string);
      }
    } catch (e) {
      console.error('Error fetching user role:', e);
    }
  };

  const fetchCommissions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('commissions')
      .select('*')
      .eq('advertiser_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCommissions(data);
      
      // Calculate monthly commission
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyTotal = data
        .filter(commission => {
          const commissionDate = new Date(commission.created_at);
          return commissionDate.getMonth() === currentMonth && 
                 commissionDate.getFullYear() === currentYear &&
                 commission.status === 'paid';
        })
        .reduce((sum, commission) => sum + commission.commission_amount, 0);
      
      setMonthlyCommission(monthlyTotal);
    }
  };

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        package_id,
        customer_id
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      // Fetch related data separately
      const reviewsWithDetails = await Promise.all(
        data.map(async (review) => {
          const [packageData, profileData] = await Promise.all([
            supabase.from('travel_packages').select('title').eq('id', review.package_id).single(),
            supabase.from('profiles').select('display_name').eq('user_id', review.customer_id).single()
          ]);
          
          return {
            ...review,
            travel_packages: packageData.data,
            profiles: profileData.data
          };
        })
      );
      
      setReviews(reviewsWithDetails.filter(r => r.travel_packages && r.profiles) as Review[]);
    }
  };

  const fetchUpcomingTrips = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        guest_count,
        status,
        package_id,
        customer_id
      `)
      .gte('booking_date', today)
      .order('booking_date', { ascending: true })
      .limit(10);

    if (!error && data) {
      // Fetch related data separately
      const tripsWithDetails = await Promise.all(
        data.map(async (trip) => {
          const [packageData, profileData] = await Promise.all([
            supabase.from('travel_packages').select('title, location').eq('id', trip.package_id).single(),
            supabase.from('profiles').select('display_name').eq('user_id', trip.customer_id).single()
          ]);
          
          return {
            ...trip,
            travel_packages: packageData.data,
            profiles: profileData.data
          };
        })
      );
      
      setUpcomingTrips(tripsWithDetails.filter(t => t.travel_packages && t.profiles) as UpcomingTrip[]);
    }
  };


  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole && userRole !== 'advertiser') {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sunset-start to-sunset-end">
      <Navbar />
      <div className="container mx-auto p-6 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">แดชบอร์ดคนกลาง</h1>
          <p className="text-white/80">ภาพรวมและสถิติของคุณ</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ค่าคอมมิชชั่นเดือนนี้</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ฿{monthlyCommission.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">คะแนนรีวิวเฉลี่ย</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reviews.length > 0 ? 
                  (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : 
                  '0.0'
                }
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ทริปที่จะมาถึง</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingTrips.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">รีวิวทั้งหมด</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reviews.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Reviews */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>รีวิวล่าสุด</CardTitle>
              <CardDescription>ความคิดเห็นจากนักท่องเที่ยว</CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">ยังไม่มีรีวิว</p>
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{review.profiles?.display_name}</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(review.created_at), { 
                            addSuffix: true, 
                            locale: th 
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">{review.travel_packages?.title}</p>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Trips */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>ทริปที่จะมาถึง</CardTitle>
              <CardDescription>รายการจองที่จะเกิดขึ้น</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingTrips.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">ไม่มีทริปที่จะมาถึง</p>
              ) : (
                <div className="space-y-4">
                  {upcomingTrips.slice(0, 5).map((trip) => (
                    <div key={trip.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                      <div>
                        <p className="font-medium">{trip.travel_packages?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {trip.travel_packages?.location} • {trip.guest_count} คน
                        </p>
                        <p className="text-sm text-muted-foreground">
                          โดย {trip.profiles?.display_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(trip.booking_date).toLocaleDateString('th-TH')}
                        </p>
                        <Badge variant={trip.status === 'confirmed' ? 'default' : 'secondary'}>
                          {trip.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอดำเนินการ'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Commission History */}
        <Card className="mt-6 bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>ประวัติค่าคอมมิชชั่น</CardTitle>
            <CardDescription>รายการค่าคอมมิชชั่นที่ได้รับ</CardDescription>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">ยังไม่มีข้อมูลค่าคอมมิชชั่น</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>จำนวนเงิน</TableHead>
                    <TableHead>เปอร์เซ็นต์</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.slice(0, 10).map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        {new Date(commission.created_at).toLocaleDateString('th-TH')}
                      </TableCell>
                      <TableCell>฿{commission.commission_amount.toLocaleString()}</TableCell>
                      <TableCell>{commission.commission_percentage}%</TableCell>
                      <TableCell>
                        <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'}>
                          {commission.status === 'paid' ? 'จ่ายแล้ว' : 'รอจ่าย'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvertiserDashboard;