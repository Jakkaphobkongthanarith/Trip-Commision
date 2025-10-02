import React, { useState, useEffect } from "react";
import { bookingAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BookingTestPage = () => {
  const [packageId, setPackageId] = useState(
    "245df04c-e1ba-4544-b598-ac477b20f6e4"
  );
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchBookings = async () => {
    if (!packageId.trim()) {
      setError("กรุณากรอก Package ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("Fetching bookings for package:", packageId);
      const response = await bookingAPI.getByPackageId(packageId);
      console.log("API Response:", response);

      setBookings(response.bookings || []);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBookings = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await bookingAPI.getAll();
      console.log("All bookings:", response);
      setBookings(response.bookings || []);
    } catch (err) {
      console.error("Error fetching all bookings:", err);
      setError(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>ทดสอบ Booking API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              placeholder="Package ID"
              className="flex-1"
            />
            <Button onClick={fetchBookings} disabled={loading}>
              {loading ? "กำลังโหลด..." : "ดึงข้อมูล Bookings"}
            </Button>
          </div>

          <Button
            onClick={fetchAllBookings}
            disabled={loading}
            variant="outline"
          >
            ดึงข้อมูล Bookings ทั้งหมด
          </Button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800">
              {error}
            </div>
          )}

          {bookings.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">
                ผลลัพธ์ ({bookings.length} รายการ):
              </h3>
              <div className="bg-gray-50 rounded p-3 max-h-96 overflow-y-auto">
                <pre className="text-sm">
                  {JSON.stringify(bookings, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {bookings.length === 0 && !loading && !error && (
            <div className="text-gray-500 text-center py-4">
              ไม่พบข้อมูล Bookings
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingTestPage;
