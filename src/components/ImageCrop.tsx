import { useState, useRef, useCallback } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from "react-image-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crop as CropIcon, RotateCcw, Check, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "react-image-crop/dist/ReactCrop.css";

interface ImageCropProps {
  src: string;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string) => void;
  aspectRatio?: number;
  onUploadStart?: () => void;
  onUploadError?: (error: string) => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCrop({
  src,
  isOpen,
  onClose,
  onCropComplete,
  aspectRatio = 16 / 9,
  onUploadStart,
  onUploadError,
}: ImageCropProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspectRatio) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  }

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("No 2d context");
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
      canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = "high";

      const cropX = crop.x * scaleX;
      const cropY = crop.y * scaleY;

      const centerX = image.naturalWidth / 2;
      const centerY = image.naturalHeight / 2;

      ctx.save();

      ctx.translate(-cropX, -cropY);
      ctx.translate(centerX, centerY);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(image, 0, 0);
      ctx.restore();

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas is empty"));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          0.95
        );
      });
    },
    [scale, rotate]
  );

  const uploadToSupabase = async (blob: Blob): Promise<string> => {
    try {
      console.log("Starting Supabase upload...");

      console.log("Skipping bucket validation, proceeding with upload...");

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileName = `cropped_${timestamp}_${randomId}.jpg`;
      const filePath = `packages/${fileName}`;

      console.log("Uploading to path:", filePath);

      const { data, error } = await supabase.storage
        .from("package-images")
        .upload(filePath, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (error) {
        console.error("Supabase upload error:", error);
        throw new Error(`อัปโหลดไม่สำเร็จ: ${error.message}`);
      }

      console.log("Upload successful:", data);

      const {
        data: { publicUrl },
      } = supabase.storage.from("package-images").getPublicUrl(filePath);

      console.log("Generated public URL:", publicUrl);
      return publicUrl;
    } catch (error) {
      console.error("Error uploading to Supabase:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
    }
  };

  const handleCropComplete = useCallback(async () => {
    if (completedCrop && imgRef.current) {
      setIsUploading(true);
      onUploadStart?.();

      try {
        const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);

        const uploadedUrl = await uploadToSupabase(croppedBlob);

        onCropComplete(uploadedUrl);
        onClose();
      } catch (error) {
        console.error("Error processing image:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ";
        onUploadError?.(errorMessage);
      } finally {
        setIsUploading(false);
      }
    }
  }, [
    completedCrop,
    getCroppedImg,
    onCropComplete,
    onClose,
    onUploadStart,
    onUploadError,
  ]);

  const resetCrop = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
    setScale(1);
    setRotate(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5" />
            ปรับแต่งรูปภาพ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Control Panel */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">ขนาด:</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground w-8">
                  {Math.round(scale * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">หมุน:</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={rotate}
                  onChange={(e) => setRotate(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground w-8">
                  {rotate}°
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={resetCrop}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              รีเซ็ต
            </Button>
          </div>

          {/* Crop Area */}
          <div className="flex justify-center max-h-[60vh] overflow-auto">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              minHeight={50}
              className="max-h-full"
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={src}
                style={{
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                  maxHeight: "500px",
                  maxWidth: "100%",
                }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>

          {/* Preview Canvas (hidden) */}
          <canvas
            ref={previewCanvasRef}
            style={{
              display: "none",
              border: "1px solid black",
              objectFit: "contain",
              width: 150,
              height: 150,
            }}
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              ยกเลิก
            </Button>
            <Button
              onClick={handleCropComplete}
              disabled={!completedCrop || isUploading}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  กำลังอัปโหลด...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  ใช้รูปภาพนี้
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
