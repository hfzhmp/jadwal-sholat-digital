import React, { useState, useEffect } from 'react';
import { 
  Moon, 
  Sun, 
  CloudSun, 
  Sunrise, 
  Sunset, 
  Clock,
  Haze 
} from 'lucide-react'; 
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import { getPhotos } from '../utils/db'; 

// --- DATA HADITS ---
const BANK_HADITS = [
  { text: "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lainnya.", riwayat: "HR. Ahmad" },
  { text: "Barangsiapa yang menempuh jalan untuk menuntut ilmu, Allah akan mudahkan baginya jalan menuju surga.", riwayat: "HR. Muslim" },
  { text: "Senyummu di hadapan saudaramu adalah (bernilai) sedekah bagimu.", riwayat: "HR. Tirmidzi" },
  { text: "Kebersihan adalah sebagian dari iman.", riwayat: "HR. Muslim" }
];

export default function Home() {
  const [time, setTime] = useState(new Date());
  
  const [jadwalSholat, setJadwalSholat] = useState([
    { name: 'Shubuh', time: '04:30' },
    { name: 'Syuruq', time: '06:00' },
    { name: 'Dzuhur', time: '12:00' },
    { name: 'Ashar', time: '15:15' },
    { name: 'Maghrib', time: '18:10' },
    { name: 'Isya', time: '19:20' },
  ]);

  const [hijriDate, setHijriDate] = useState({ day: 1, month: 'Muharram', year: 1445 });
  const [currentPrayer, setCurrentPrayer] = useState(null); 
  const [nextPrayer, setNextPrayer] = useState(null);    
  const [countdown, setCountdown] = useState('00:00:00');
  const [ramadanStatus, setRamadanStatus] = useState({ text: 'Menuju Ramadhan', count: '...' });
  const [haditsHariIni, setHaditsHariIni] = useState(BANK_HADITS[0]);
  
  const [sliderData, setSliderData] = useState([]);

  // Hoisted functions
  function hitungRamadhan(bulanHijri, hariHijri) {
    const RAMADHAN = 9;
    if (bulanHijri === RAMADHAN) {
      setRamadanStatus({ text: 'Ramadhan', count: `Hari Ke-${hariHijri}` });
    } else {
      let hariMenuju = 0;
      if (bulanHijri < RAMADHAN) {
        const sisaBulanIni = 30 - hariHijri;
        const bulanAntara = (RAMADHAN - bulanHijri - 1) * 30;
        hariMenuju = sisaBulanIni + bulanAntara;
      } else {
        const sisaTahunIni = (12 - bulanHijri) * 30 + (30 - hariHijri);
        hariMenuju = sisaTahunIni + (8 * 30); 
      }
      setRamadanStatus({ text: 'Menuju Ramadhan', count: `${hariMenuju} Hari` });
    }
  }

  function processPrayerTimes(now) {
    let active = null;   
    let upcoming = null; 
    let targetTime = null;

    for (let i = 0; i < jadwalSholat.length; i++) {
      const sholat = jadwalSholat[i];
      const [h, m] = sholat.time.split(':').map(Number);
      const prayerDate = new Date(now);
      prayerDate.setHours(h, m, 0, 0);

      if (now >= prayerDate) {
        active = sholat;
      } else {
        if (!upcoming) {
          upcoming = sholat;
          targetTime = prayerDate;
        }
      }
    }

    if (!upcoming) {
      upcoming = jadwalSholat[0];
      const [h, m] = upcoming.time.split(':').map(Number);
      targetTime = new Date(now);
      targetTime.setDate(targetTime.getDate() + 1); 
      targetTime.setHours(h, m, 0, 0);
    }

    setCurrentPrayer(active); 
    setNextPrayer(upcoming);  

    const diff = targetTime - now;
    if (diff > 0) {
      const hours = Math.floor((diff / (1000 * 60 * 60)));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    } else {
      setCountdown("00:00:00");
    }
  }

  function getPrayerIcon(name, isActive) {
    const style = `w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`; 
    switch(name) {
      case 'Shubuh': return <CloudSun className={style} />;
      case 'Syuruq': return <Sunrise className={style} />;
      case 'Dzuhur': return <Sun className={style} />;
      case 'Ashar': return <Haze className={style} />;
      case 'Maghrib': return <Sunset className={style} />;
      case 'Isya': return <Moon className={style} />;
      default: return <Clock className={style} />;
    }
  }

  // 1. FETCH API & LOGIC
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * BANK_HADITS.length);
    setHaditsHariIni(BANK_HADITS[randomIndex]);

    const fetchJadwal = async () => {
      try {
        const date = new Date();
        const todayStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`; 
        
        const response = await fetch(
          `https://api.aladhan.com/v1/timingsByCity/${todayStr}?city=Depok&country=Indonesia&method=20`
        );
        const data = await response.json();
        const timings = data.data.timings;
        const hijri = data.data.date.hijri;

        const newJadwal = [
          { name: 'Shubuh', time: timings.Fajr },
          { name: 'Syuruq', time: timings.Sunrise },
          { name: 'Dzuhur', time: timings.Dhuhr },
          { name: 'Ashar', time: timings.Asr },
          { name: 'Maghrib', time: timings.Maghrib },
          { name: 'Isya', time: timings.Isha },
        ];
        setJadwalSholat(newJadwal);

        setHijriDate({
            day: parseInt(hijri.day),
            month: hijri.month.en,
            year: parseInt(hijri.year),
            monthNum: hijri.month.number
        });

        hitungRamadhan(parseInt(hijri.month.number), parseInt(hijri.day));

      } catch (error) {
        console.error("Gagal ambil jadwal sholat:", error);
      }
    };

    fetchJadwal();
    
    const haditsInterval = setInterval(() => {
        const idx = Math.floor(Math.random() * BANK_HADITS.length);
        setHaditsHariIni(BANK_HADITS[idx]);
    }, 1000 * 60 * 60);

    return () => clearInterval(haditsInterval);
  }, []);

  // LOAD IMAGES FROM DB
  useEffect(() => {
    const loadPhotos = async () => {
      const photosFromDB = await getPhotos();
      
      if (photosFromDB.length === 0) {
        setSliderData([
            { id: 1, imageUrl: '/slider1.jpg', title: 'Default Image 1', location: 'Lokasi 1' },
            { id: 2, imageUrl: '/slider2.jpg', title: 'Default Image 2', location: 'Lokasi 2' },
            { id: 3, imageUrl: '/slider3.jpg', title: 'Default Image 3', location: 'Lokasi 3' }
        ]);
      } else {
        setSliderData(photosFromDB);
      }
    };
    loadPhotos();
    
    const photoInterval = setInterval(loadPhotos, 5 * 60 * 1000);
    return () => clearInterval(photoInterval);
  }, []);

  // 2. JAM ENGINE
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);
      processPrayerTimes(now);
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jadwalSholat]); 

  return (
    <div className="min-h-screen lg:h-screen w-full bg-slate-900 text-white font-sans relative overflow-y-auto lg:overflow-hidden flex flex-col p-4 lg:p-6 gap-4 lg:gap-6">
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <img src="/bg.jpg" alt="Background" className="w-full h-full object-cover opacity-50 fixed lg:absolute" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/80 fixed lg:absolute"></div>
      </div>

      {/* HEADER */}
      <header className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 shrink-0">
        <div className="bg-emerald-900/40 border border-emerald-500/30 backdrop-blur-md px-4 lg:px-5 py-2 lg:py-3 rounded-2xl flex items-center gap-3 lg:gap-4 shadow-lg transition-all hover:bg-emerald-900/60 w-full md:w-auto">
          <div className="bg-emerald-500 w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full animate-pulse shadow-[0_0_10px_#10b981] shrink-0"></div>
          <div>
            <p className="text-emerald-400 text-[10px] lg:text-xs font-bold uppercase tracking-widest">{ramadanStatus.text}</p>
            <p className="text-lg lg:text-xl font-bold text-white font-mono">{ramadanStatus.count}</p>
          </div>
        </div>

        <div className="text-left md:text-right w-full md:w-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white drop-shadow-lg">
            {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h1>
          <p className="text-base lg:text-lg text-emerald-400 font-medium mt-0 lg:mt-1">
            {hijriDate.day} {hijriDate.month} {hijriDate.year} H
          </p>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-8">
        
        {/* KOLOM KIRI */}
        <section className="lg:col-span-4 flex flex-col gap-4 h-auto lg:h-full">
          {/* JAM UTAMA */}
          <div className="bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex items-center justify-center shadow-xl shrink-0">
            <div className="flex items-start gap-1 lg:gap-2">
                <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold font-mono tracking-tighter text-white drop-shadow-2xl leading-none">
                  {time.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                </h1>
                <span className="text-slate-500 font-mono text-xl lg:text-3xl font-bold tracking-widest pt-1 lg:pt-2 opacity-60">
                    {time.getSeconds().toString().padStart(2, '0')}
                </span>
            </div>
          </div>

          {/* COUNTDOWN BAR */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-4 lg:p-5 flex items-center justify-between shadow-[0_0_25px_rgba(37,99,235,0.3)] border-t border-blue-400 shrink-0">
             <div className="flex items-center gap-2 lg:gap-3">
               <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-blue-100" />
               <div>
                 <p className="text-blue-100 flex text-[10px] lg:text-xs font-bold uppercase tracking-widest opacity-80">
                    Menuju Waktu
                 </p>
                 <p className="text-xl lg:text-2xl font-bold text-white tracking-wide mt-0 lg:mt-0.5">
                    {nextPrayer ? nextPrayer.name : '...'}
                 </p>
               </div>
             </div>
             <div className="text-2xl lg:text-4xl font-mono font-bold text-white tabular-nums">
                {countdown}
             </div>
          </div>

          {/* HADITS CARD */}
          <div className="flex-1 min-h-[200px] lg:min-h-0 bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-5 lg:p-6 flex flex-col justify-center relative overflow-hidden group">
             <div className="absolute -right-2 -bottom-6 text-[8rem] lg:text-[10rem] text-white/5 font-serif leading-none select-none">”</div>
             <div className="relative z-10 flex flex-col h-full justify-center">
               <span className="bg-emerald-500/20 text-emerald-300 text-[10px] lg:text-xs font-bold px-2 lg:px-3 py-1 rounded-full border border-emerald-500/30 mb-3 lg:mb-4 inline-block w-fit">
                 Hadits Hari Ini
               </span>
               <p className="text-base sm:text-lg lg:text-xl text-slate-100 font-medium leading-relaxed font-serif animate-fade-in line-clamp-4 lg:line-clamp-none">
                 "{haditsHariIni.text}"
               </p>
               <div className="mt-4 lg:mt-6 flex items-center gap-2">
                  <div className="h-0.5 w-6 lg:w-8 bg-emerald-500"></div>
                  <p className="text-emerald-400 font-bold text-xs lg:text-sm uppercase tracking-widest">
                    {haditsHariIni.riwayat}
                  </p>
               </div>
             </div>
          </div>
        </section>

        {/* KOLOM KANAN (SLIDER MULTI-IMAGE) */}
        <section className="lg:col-span-8 min-h-[250px] sm:min-h-[350px] lg:min-h-0 lg:h-full rounded-2xl lg:rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl group flex-shrink-0">
           {sliderData.length > 0 ? (
             <Swiper
                modules={[Autoplay, EffectFade]}
                effect="fade"
                speed={1500} 
                autoplay={{ 
                  delay: 20000, 
                  disableOnInteraction: false 
                }}
                loop={sliderData.length > 1} 
                className="w-full h-full bg-black/50"
             >
                {sliderData.map((slide) => (
                  <SwiperSlide key={slide.id}>
                     <div className="relative w-full h-full">
                       <img 
                          src={slide.imageUrl} 
                          alt={slide.title}
                          className="w-full h-full object-cover transition-transform duration-[25s] scale-100 hover:scale-110" 
                       />
                       
                       <div className="absolute bottom-0 left-0 w-full p-6 lg:p-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10">
                          <h3 className="text-xl lg:text-3xl font-bold text-white mb-1 lg:mb-2">{slide.title}</h3>
                          <p className="text-sm lg:text-base text-slate-300">{slide.location}</p>
                       </div>
                     </div>
                  </SwiperSlide>
                ))}
             </Swiper>
           ) : (
              <div className="w-full h-full bg-slate-800/80 flex items-center justify-center">
                 <p className="text-sm lg:text-base text-slate-400">Loading gambar...</p>
              </div>
           )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="h-auto lg:h-36 shrink-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 pb-2 lg:pb-0">
        {jadwalSholat.map((sholat, index) => {
          const isActive = currentPrayer && currentPrayer.name === sholat.name;

          return (
            <div 
              key={index} 
              className={`relative rounded-2xl lg:rounded-3xl flex flex-col items-center justify-center border transition-all duration-300 py-3 lg:py-0 ${
                isActive 
                  ? 'scale-[1.02] lg:scale-105 z-20 shadow-[0_0_20px_-5px_rgba(56,189,248,0.5)] lg:shadow-[0_0_40px_-5px_rgba(56,189,248,0.5)] border-transparent' 
                  : 'bg-slate-800/40 border-white/5 opacity-80'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl lg:rounded-3xl animate-pulse-slow" />
              )}
              <div className="relative z-10 flex flex-col items-center gap-0.5 lg:gap-1">
                 <div className="flex items-center gap-1 lg:gap-2 mb-0.5 lg:mb-1">
                    <div className="scale-75 lg:scale-100">
                      {getPrayerIcon(sholat.name, isActive)}
                    </div>
                    <span className={`text-sm md:text-base lg:text-xl font-bold uppercase tracking-widest ${isActive ? 'text-blue-50' : 'text-slate-400'}`}>
                      {sholat.name}
                    </span>
                 </div>
                 <span className={`text-3xl md:text-4xl lg:text-5xl font-bold font-mono tracking-tighter ${isActive ? 'text-white' : 'text-slate-200'}`}>
                   {sholat.time}
                 </span>
              </div>
            </div>
          );
        })}
      </footer>
    </div>
  );
}
