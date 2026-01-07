export async function uploadToCloudinary(file: File, uploadPreset: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch("https://api.cloudinary.com/v1_1/dr3btabmo/image/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!data.secure_url) throw new Error("Image upload failed");
  return data.secure_url as string;
}
