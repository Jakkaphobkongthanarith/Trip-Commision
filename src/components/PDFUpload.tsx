import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PDFUploadProps {
  packageId: string;
  currentPdfUrl?: string;
  onUploadSuccess: (pdfUrl: string) => void;
}

export const PDFUpload = ({
  packageId,
  currentPdfUrl,
  onUploadSuccess,
}: PDFUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast({
        title: "ไฟล์ไม่ถูกต้อง",
        description: "กรุณาเลือกไฟล์ PDF เท่านั้น",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "ไฟล์ใหญ่เกินไป",
        description: "ขนาดไฟล์ต้องไม่เกิน 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // For now, simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("package_id", packageId);

      // TODO: Replace with actual API endpoint
      // const response = await fetch("/api/packages/upload-pdf", {
      //   method: "POST",
      //   body: formData,
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate success response
      const mockPdfUrl = URL.createObjectURL(file);

      clearInterval(interval);
      setUploadProgress(100);

      // Wait a bit to show completion
      setTimeout(() => {
        onUploadSuccess(mockPdfUrl);
        setUploading(false);
        setUploadProgress(0);

        toast({
          title: "อัปโหลดสำเร็จ",
          description: "ไฟล์ PDF ถูกอัปโหลดเรียบร้อยแล้ว",
        });
      }, 500);
    } catch (error) {
      console.error("Upload error:", error);
      setUploading(false);
      setUploadProgress(0);

      toast({
        title: "อัปโหลดล้มเหลว",
        description: "กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const removePDF = () => {
    // TODO: Call API to remove PDF
    onUploadSuccess("");
    toast({
      title: "ลบไฟล์แล้ว",
      description: "ไฟล์ PDF ถูกลบออกจากแพคเกจแล้ว",
    });
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">เอกสาร PDF แพคเกจ</h4>
        {currentPdfUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={removePDF}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            ลบไฟล์
          </Button>
        )}
      </div>

      {currentPdfUrl ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">ไฟล์ PDF อัปโหลดแล้ว</p>
                <p className="text-xs text-muted-foreground">
                  คลิกเพื่อดูไฟล์ หรือลบเพื่ออัปโหลดไฟล์ใหม่
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(currentPdfUrl, "_blank")}
              >
                ดูไฟล์
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={openFileDialog}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              } ${uploading ? "pointer-events-none opacity-50" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {uploading ? (
                <div className="space-y-4">
                  <Upload className="h-8 w-8 mx-auto animate-pulse text-primary" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">กำลังอัปโหลด...</p>
                    <Progress
                      value={uploadProgress}
                      className="w-full max-w-xs mx-auto"
                    />
                    <p className="text-xs text-muted-foreground">
                      {uploadProgress}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {dragActive
                        ? "วางไฟล์ PDF ที่นี่"
                        : "ลากไฟล์ PDF มาวาง หรือคลิกเพื่อเลือกไฟล์"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      รองรับไฟล์ PDF เท่านั้น (ขนาดไม่เกิน 10MB)
                    </p>
                  </div>
                  <Button variant="outline" size="sm" type="button">
                    <Upload className="h-4 w-4 mr-2" />
                    เลือกไฟล์
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
