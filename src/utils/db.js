import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";

// --- KONFIGURASI CLOUDINARY ANDA ---
// Dapatkan ini dengan mengikuti PANDUAN_CLOUDINARY.md
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; 
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Koleksi data teks (judul & lokasi) di Firestore
const photosCollection = collection(db, "photos");

// Fungsi Helper untuk mengunggah gambar ke Cloudinary tanpa server/backend (Unsigned)
const uploadToCloudinary = async (imageFile) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error("Cloudinary belum disetting. Silahkan cek PANDUAN_CLOUDINARY.md dan update file src/utils/db.js !");
  }

  const fd = new FormData();
  fd.append("file", imageFile);
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: fd,
  });

  if (!response.ok) {
    throw new Error("Gagal mengupload gambar ke Cloudinary");
  }

  const data = await response.json();
  return data.secure_url; // Mengembalikan link foto siap pakai!
};

export const getPhotos = async () => {
  try {
    const q = query(photosCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const photos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return photos;
  } catch (err) {
    if (err.code === "permission-denied") {
        console.error("Firestore Permission Denied. Pastikan sudah mengatur 'Start in Test Mode' di rules database.");
    }
    console.error("Error getting photos from Firestore:", err);
    return [];
  }
};

export const addPhoto = async (photoData, imageFile) => {
  try {
    // 1. Upload file gambar ke Cloudinary gratisan
    const imageUrl = await uploadToCloudinary(imageFile);

    // 2. Simpan tautan url (beserta Judul & Lokasi) ke Database Firestore Anda
    const newDoc = await addDoc(photosCollection, {
      title: photoData.title,
      location: photoData.location,
      imageUrl: imageUrl, 
      createdAt: serverTimestamp()
    });

    return {
      id: newDoc.id,
      title: photoData.title,
      location: photoData.location,
      imageUrl: imageUrl,
    };
  } catch (err) {
    console.error("Error adding photo / uploading to Cloud:", err);
    throw err;
  }
};

export const updatePhoto = async (id, updatedData, newImageFile = null) => {
  try {
    const docRef = doc(db, "photos", id);
    let finalImageUrl = updatedData.imageUrl; // Default pakai gambar lama

    // Jika admin mengupload gambar baru saat Edit
    if (newImageFile) {
      // 1. Upload gambar ke Cloudinary kembali
      finalImageUrl = await uploadToCloudinary(newImageFile);
      // Catatan: Gambar lama otomatis menjadi 'orphan' (mengambang di akun Cloudinary).
      // Membiarkannya tidak masalah krn kuota ada 25 GigaByte.
    }

    // Update dokumen judul & url di database Firestore
    await updateDoc(docRef, {
      title: updatedData.title,
      location: updatedData.location,
      imageUrl: finalImageUrl,
    });

    return true;
  } catch (err) {
    console.error("Error updating photo:", err);
    throw err;
  }
};

export const deletePhoto = async (id) => {
  try {
    const docRef = doc(db, "photos", id);

    // Hapus dokumen referensinya dari Firestore (Data Teks nya)
    await deleteDoc(docRef);

    // Catatan: Jika ingin menghapus foto dari Cloudinary, dibutuhkan 'Backend Server / API Secret'.
    // Krn website React murni berjalan di browser user (hp), maka tidak aman melakukan hapus file dari depan.
    // Menghapus dari Firestore saja sudah cukup (fotanya otomatis hilang dari list di HP & Laptop).

    return true;
  } catch (err) {
    console.error("Error deleting photo:", err);
    throw err;
  }
};
