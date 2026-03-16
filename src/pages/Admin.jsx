import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, Trash2, Edit2, ChevronLeft, Save, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getPhotos, addPhoto, updatePhoto, deletePhoto } from '../utils/db';
import imageCompression from 'browser-image-compression';

export default function Admin() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // <--- Tambahan untuk loading saat save
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    imagePreview: null, // base64/url preview untuk ditampilkan di UI
    imageFile: null,    // file asli yang akan dikompres & diupload
    storagePath: null   // jika edit, kita perlu tau path cloud lamanya
  });
  const fileInputRef = useRef(null);

  // Load photos
  const fetchPhotos = async () => {
    setLoading(true);
    const data = await getPhotos();
    setPhotos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  // Form handle
  const handleOpenForm = (photo = null) => {
    if (photo) {
      setEditingId(photo.id);
      setFormData({
        title: photo.title,
        location: photo.location,
        imagePreview: photo.imageUrl, // Firebase downloadUrl
        imageFile: null,
        storagePath: photo.storagePath // Disimpan untuk keperluan delete/update Firebase
      });
    } else {
      setEditingId(null);
      setFormData({ title: '', location: '', imagePreview: null, imageFile: null, storagePath: null });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setFormData({ title: '', location: '', imagePreview: null, imageFile: null, storagePath: null });
  };

  // KOMPRESI GAMBAR & BUAT PREVIEW LOKAL
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // 1. Buat preview untuk form admin langsung menggunakan temporary object URL 
      const previewUrl = URL.createObjectURL(file);
      
      // 2. Setting Compression
      const options = {
        maxSizeMB: 1, // Max ukuran 1 MB (Bisa disesuaikan misal 0.5 atau 0.8)
        maxWidthOrHeight: 1920, // Max resolusi 1080p agar tetap tajam namun rigngan
        useWebWorker: true
      };

      // 3. Kompres langsung file aslinya!
      const compressedFile = await imageCompression(file, options);
      
      // Simpan perubahan ke state (File yang siap upload + preview URL sementara)
      setFormData({ ...formData, imagePreview: previewUrl, imageFile: compressedFile });
      
    } catch (error) {
      console.error("Gagal melakukan kompresi foto:", error);
      alert("Terjadi kesalahan saat mengecilkan ukuran foto!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.imagePreview && !formData.imageFile) {
      alert("Harus ada gambar!");
      return;
    }

    try {
      setIsSaving(true); // <-- Tampilkan Spinner ke user
      
      if (editingId) {
        // Jika ada foto baru dipilih saat edit, berarti kita perlu memberitahu API untuk ganti file storage
        const newImageFile = formData.imageFile || null;
        
        await updatePhoto(editingId, {
          title: formData.title,
          location: formData.location,
          imageUrl: formData.imagePreview 
        }, newImageFile);
        
      } else {
        // Mode Add
        if (!formData.imageFile) {
           alert("Anda belum memilih file gambar asli!");
           setIsSaving(false);
           return;
        }

        await addPhoto({
          title: formData.title,
          location: formData.location
        }, formData.imageFile);
      }

      handleCloseForm();
      fetchPhotos(); // Re-fetch
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Gagal menyimpan data! Pastikan Anda sudah mengatur config Firebase.");
    } finally {
      setIsSaving(false); // Sembunyikan spinner
    }
  };

  const handleDelete = async (id, storagePath) => {
    if (window.confirm("Yakin hapus foto ini dari Database? (Tidak dapat dikembalikan)")) {
      setLoading(true); // Biar nggak di-klik 2 kali
      await deletePhoto(id, storagePath);
      fetchPhotos();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      
      {/* Header Admin */}
      <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
            disabled={isSaving}
          >
            <ChevronLeft className="w-5 h-5"/>
          </button>
          <div>
            <h1 className="font-bold text-lg text-slate-900 leading-tight">Admin Panel</h1>
            <p className="text-xs text-slate-500">Kelola Slider Firebase</p>
          </div>
        </div>
        
        <button 
          onClick={() => handleOpenForm()}
          className="bg-blue-600 text-white p-2 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm shadow-blue-600/30 active:scale-95 transition-transform disabled:opacity-50"
          disabled={isSaving}
        >
          <ImagePlus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah Foto</span>
        </button>
      </div>

      {/* List Photos */}
      <div className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="text-center py-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-slate-400 text-sm">Menghubungkan ke server...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="bg-slate-100 p-4 rounded-full mb-3">
              <ImageIcon className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">Belum ada foto di Cloud</p>
            <p className="text-slate-400 text-sm mt-1">Silakan upload foto pertama. Gambar akan dikompres otomatis.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-white border text-left border-slate-100 p-3 rounded-2xl shadow-sm flex gap-4 items-center">
                <img 
                  src={photo.imageUrl} 
                  alt={photo.title}
                  className="w-20 h-20 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100"
                  loading="lazy"
                />
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{photo.title || 'Tanpa Judul'}</h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{photo.location || 'Lokasi tidak diset'}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => handleOpenForm(photo)}
                    className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100"
                  >
                     <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(photo.id, photo.storagePath)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                     <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal/Bottom Sheet Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="font-bold text-slate-800">
                {editingId ? 'Edit Foto' : 'Upload Foto Baru'}
              </h2>
              {/* Matikan tombol close jika lagi proses saving (upload) ke internet */}
              <button 
                onClick={handleCloseForm} 
                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                disabled={isSaving}
              >
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <form id="photo-form" onSubmit={handleSubmit} className="space-y-4">
                
                {/* Upload Image Area */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Foto (Akan dikompres otomatis)</label>
                  <div 
                    onClick={() => !isSaving && fileInputRef.current?.click()}
                    className={`border-2 border-dashed border-slate-200 rounded-2xl h-48 flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden ${isSaving ? 'opacity-50 pointer-events-none' : 'hover:border-blue-400'} transition-colors relative`}
                  >
                    {formData.imagePreview ? (
                      <img src={formData.imagePreview} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm font-medium text-slate-500">Tap untuk pilih foto galeri</span>
                        <span className="text-xs text-slate-400 mt-1">Maks. dikompres ~1 MB</span>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Judul Acara</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Cth: Kajian Rutin"
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Lokasi / Keterangan</label>
                  <input 
                    type="text" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Cth: Masjid Al-Ikhlas"
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm"
                    disabled={isSaving}
                  />
                </div>

              </form>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                type="submit"
                form="photo-form"
                disabled={isSaving}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:bg-blue-400 disabled:shadow-none"
              >
                {isSaving ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin"/>
                        Uploading...
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4" />
                        Simpan ke Cloud
                    </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
