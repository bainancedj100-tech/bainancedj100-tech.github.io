/* ----------------------------------------------------
   منصة وتطبيق الحكيم - AL-HAKEEM LOGIC & SUPABASE INTEGRATION
---------------------------------------------------- */

// Supabase State & Appointments Array
let supabaseClient = null;
let userAppointments = JSON.parse(localStorage.getItem('alhakeem_my_appointments') || '[]');

function initSupabase() {
    const sbUrl = localStorage.getItem('alhakeem_sb_url');
    const sbKey = localStorage.getItem('alhakeem_sb_key');

    if (sbUrl && sbKey && window.supabase) {
        try {
            supabaseClient = window.supabase.createClient(sbUrl, sbKey);
            updateSupabaseStatusUI(true);
            fetchDoctorsFromSupabase();
            fetchAppointmentsFromSupabase();
        } catch (err) {
            console.error("Failed to initialize Supabase:", err);
            updateSupabaseStatusUI(false);
        }
    } else {
        updateSupabaseStatusUI(false);
    }
    updateAppointmentsBadge();
}

function updateSupabaseStatusUI(isConnected) {
    const textEl = document.getElementById('supabase-status-text');
    const btnEl = document.getElementById('btn-supabase-status');
    if (textEl && btnEl) {
        if (isConnected) {
            textEl.textContent = 'Supabase متصل 🟢';
            btnEl.style.borderColor = 'var(--accent-emerald)';
            btnEl.style.color = 'var(--accent-emerald)';
        } else {
            textEl.textContent = 'ربط Supabase 🔗';
            btnEl.style.borderColor = 'var(--border-color)';
            btnEl.style.color = 'var(--text-secondary)';
        }
    }
}

// Fetch doctors and reviews live from Supabase
async function fetchDoctorsFromSupabase() {
    if (!supabaseClient) return;

    try {
        const { data: doctors, error } = await supabaseClient.from('doctors').select('*');
        if (error) return;

        if (doctors && doctors.length > 0) {
            doctorsData = doctors.map(d => ({
                id: d.id,
                name: d.name,
                specialty: d.specialty,
                title: d.title || `أخصائي ${d.specialty}`,
                city: d.city,
                address: d.address || d.city,
                price: Number(d.price),
                currency: d.currency || 'د.ج',
                experienceYears: d.experience_years || 5,
                phone: d.phone || '',
                workingHours: d.working_hours || 'السبت إلى الخميس (09:00 ص - 04:00 م)',
                bio: d.bio || '',
                rating: Number(d.rating) || 5.0,
                reviewsCount: d.reviews_count || 0,
                gender: d.gender || 'male',
                avatarBg: d.avatar_bg || '#e0f2fe',
                reviews: []
            }));

            const { data: reviews } = await supabaseClient.from('reviews').select('*');
            if (reviews) {
                reviews.forEach(r => {
                    const doc = doctorsData.find(d => d.id === r.doctor_id);
                    if (doc) {
                        doc.reviews.push({
                            author: r.author,
                            stars: r.stars,
                            date: new Date(r.created_at).toLocaleDateString('ar-EG'),
                            comment: r.comment
                        });
                    }
                });
            }

            populateSelectOptions();
            renderDoctors(doctorsData);
        }
    } catch (err) {
        console.error("Supabase sync error:", err);
    }
}

// Fetch appointments live from Supabase
async function fetchAppointmentsFromSupabase() {
    if (!supabaseClient) return;

    try {
        const { data: appointments, error } = await supabaseClient.from('appointments').select('*').order('created_at', { ascending: false });
        if (error) return;

        if (appointments) {
            userAppointments = appointments.map(app => {
                const doc = doctorsData.find(d => d.id === app.doctor_id);
                return {
                    id: app.id,
                    doctorId: app.doctor_id,
                    doctorName: doc ? doc.name : 'طبيب عيادة الحكيم',
                    specialty: doc ? doc.specialty : 'طب عام',
                    patientName: app.patient_name,
                    patientPhone: app.patient_phone,
                    date: app.appointment_date,
                    time: app.appointment_time,
                    notes: app.notes || '',
                    status: app.status || 'مؤكد',
                    price: doc ? doc.price : 3000
                };
            });

            localStorage.setItem('alhakeem_my_appointments', JSON.stringify(userAppointments));
            updateAppointmentsBadge();
        }
    } catch (err) {
        console.error("Fetch appointments error:", err);
    }
}

// Cancel appointment in Supabase and locally
async function cancelAppointment(appointmentId) {
    const appIndex = userAppointments.findIndex(a => a.id === appointmentId);
    if (appIndex === -1) return;

    const appointment = userAppointments[appIndex];
    appointment.status = 'ملغى';

    if (supabaseClient) {
        try {
            await supabaseClient.from('appointments')
                .update({ status: 'ملغى' })
                .eq('id', appointmentId);
        } catch (err) {
            console.error("Cancel appointment Supabase error:", err);
        }
    }

    localStorage.setItem('alhakeem_my_appointments', JSON.stringify(userAppointments));
    updateAppointmentsBadge();
    renderMyAppointmentsModal();
    showToast(`تم إلغاء الموعد بنجاح وتحديث الحالة سحابياً عند د. ${appointment.doctorName}`, 'info');
}

function updateAppointmentsBadge() {
    const badge = document.getElementById('appointments-badge-count');
    const activeApps = userAppointments.filter(a => a.status === 'مؤكد');
    if (badge) badge.textContent = activeApps.length;
}

// SVG Avatar Generators
function generateDoctorAvatarSvg(gender, colorHex) {
    const isFemale = gender === 'female';
    const hairStyle = isFemale 
        ? `<path d="M30 42 C30 25, 70 25, 70 42 C72 55, 72 65, 68 85 C66 75, 65 60, 65 50 C65 30, 35 30, 35 50 C35 60, 34 75, 32 85 C28 65, 28 55, 30 42 Z" fill="#2d3748"/>`
        : `<path d="M32 38 C32 25, 68 25, 68 38 C68 32, 60 22, 50 22 C40 22, 32 32, 32 38 Z" fill="#1a202c"/>`;
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="${colorHex}" rx="20"/>
        <path d="M20 100 L30 65 L42 62 L50 72 L58 62 L70 65 L80 100 Z" fill="#ffffff"/>
        <path d="M42 62 L50 72 L58 62 L55 100 L45 100 Z" fill="#e2e8f0"/>
        <path d="M38 64 C38 78, 62 78, 62 64" fill="none" stroke="#0d9488" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="50" cy="79" r="4" fill="#0284c7"/>
        <path d="M42 55 L58 55 L58 64 L42 64 Z" fill="#f6ad55"/>
        <circle cx="50" cy="42" r="18" fill="#f6ad55"/>
        ${hairStyle}
        <circle cx="43" cy="42" r="2" fill="#2d3748"/>
        <circle cx="57" cy="42" r="2" fill="#2d3748"/>
        <path d="M44 49 Q50 54 56 49" fill="none" stroke="#2d3748" stroke-width="2" stroke-linecap="round"/>
        <circle cx="50" cy="27" r="5" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/>
    </svg>`;
    
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Initial Sample Database of Doctors
let doctorsData = [
    {
        id: 1,
        name: "د. عبد الرزاق بن علي",
        specialty: "جراحة العظام",
        title: "أخصائي جراحة العظام والمفاصل والعمود الفقري",
        city: "الجزائر العاصمة",
        address: "حي حيدرة - شارع القدس - عيادة النور الطبية",
        price: 3500,
        currency: "د.ج",
        experienceYears: 16,
        phone: "+213 551 23 45 67",
        workingHours: "السبت إلى الأربعاء (09:00 ص - 04:30 م)",
        bio: "خريج كلية الطب بالجزائر، زميل الجمعية الفرنسية لجراحة المفاصل والعمود الفقري.",
        rating: 4.9,
        reviewsCount: 38,
        gender: "male",
        avatarBg: "#e0f2fe",
        reviews: [
            { author: "كمال ب.", stars: 5, date: "قبل يومين", comment: "طبيب ممتاز جداً ومحترف." }
        ]
    },
    {
        id: 2,
        name: "د. سارة بلقاسم",
        specialty: "الأمراض الجلدية",
        title: "أخصائية الأمراض الجلدية والتجميل والعلاج بالليزر",
        city: "وهران",
        address: "حي إيسستو - حي العقيد لطفي - مجمع الشفاء الطبي",
        price: 3000,
        currency: "د.ج",
        experienceYears: 11,
        phone: "+213 552 98 76 54",
        workingHours: "الأحد إلى الخميس (10:00 ص - 05:00 م)",
        bio: "دكتورة متخصصة في العلاجات الجلدية المتطورة والتجميل غير الجراحي.",
        rating: 4.8,
        reviewsCount: 52,
        gender: "female",
        avatarBg: "#fce7f3",
        reviews: [
            { author: "إيمان ج.", stars: 5, date: "أمس", comment: "دكتورة بشوشة وتستمع للمريض بقلب رحب." }
        ]
    },
    {
        id: 3,
        name: "د. يوسف التلمساني",
        specialty: "أمراض القلب",
        title: "استشاري أمراض القلب وقسطرة الشرايين والتخطيط الكهربائي",
        city: "قسنطينة",
        address: "حي سيدي مبروك - مقابل المستشفى الجامعي",
        price: 4500,
        currency: "د.ج",
        experienceYears: 20,
        phone: "+213 553 44 55 66",
        workingHours: "السبت إلى الخميس (08:30 ص - 03:00 م)",
        bio: "أستاذ مبرز في أمراض القلب وتخطيط صمامات القلب.",
        rating: 5.0,
        reviewsCount: 64,
        gender: "male",
        avatarBg: "#dcfce7",
        reviews: [
            { author: "الحاج أحمد", stars: 5, date: "قبل 3 أيام", comment: "طبيب يبعث الطمأنينة في قلب المريض." }
        ]
    },
    {
        id: 4,
        name: "د. أمينة حداد",
        specialty: "طب الأطفال",
        title: "أخصائية طب الأطفال وحديثي الولادة",
        city: "عنابة",
        address: "شارع ابن خلدون - مجمع الشفاء الطبي",
        price: 2500,
        currency: "د.ج",
        experienceYears: 14,
        phone: "+213 554 11 22 33",
        workingHours: "السبت إلى الأربعاء (09:00 ص - 04:00 م)",
        bio: "خبرة واسعة في متابعة نمو الأطفال وأمراض الحساسية والصدرية للرضع.",
        rating: 4.9,
        reviewsCount: 41,
        gender: "female",
        avatarBg: "#fef3c7",
        reviews: [
            { author: "سارة م.", stars: 5, date: "قبل أسبوع", comment: "معاملة راقية جداً مع الأطفال." }
        ]
    },
    {
        id: 5,
        name: "د. محمد مهدي",
        specialty: "طب الأسنان",
        title: "جراح أسنان وأخصائي تقويم وزراعة الأسنان",
        city: "سطيف",
        address: "حي عين تبينت - بجانب صيدلية الأمل",
        price: 2800,
        currency: "د.ج",
        experienceYears: 12,
        phone: "+213 555 66 77 88",
        workingHours: "الأحد إلى الخميس (09:00 ص - 05:30 م)",
        bio: "عيادة مجهزة بأحدث تقنيات الليزر وزراعة الأسنان وتجميل الابتسامة.",
        rating: 4.7,
        reviewsCount: 29,
        gender: "male",
        avatarBg: "#e0e7ff",
        reviews: [
            { author: "رضوان ك.", stars: 5, date: "قبل 4 أيام", comment: "عمل نقي ودقيق جداً بدون ألم." }
        ]
    },
    {
        id: 6,
        name: "د. ليلى زروقي",
        specialty: "طب وجراحة العيون",
        title: "أخصائية أمراض وجراحة العيون وعلاج المياه البيضاء والليزك",
        city: "تلمسان",
        address: "وسط المدينة - شارع أولوية التحرير",
        price: 3200,
        currency: "د.ج",
        experienceYears: 15,
        phone: "+213 556 99 88 77",
        workingHours: "السبت إلى الأربعاء (08:30 ص - 03:30 م)",
        bio: "متخصصة في جراحات العيون الدقيقة وفحص الشبكية بالكمبيوتر.",
        rating: 4.9,
        reviewsCount: 33,
        gender: "female",
        avatarBg: "#fce7f3",
        reviews: [
            { author: "فاطمة الزهراء", stars: 5, date: "قبل 5 أيام", comment: "تشخيص دقيق ومعاملة ممتازة." }
        ]
    },
    {
        id: 7,
        name: "د. فاروق بوعلام",
        specialty: "طب عام",
        title: "طبيب عام واستشاري الطب الأسري ومتابعة الأمراض المزمنة",
        city: "البليدة",
        address: "حي باب السبت - العمارة B - الطابق الأول",
        price: 2000,
        currency: "د.ج",
        experienceYears: 18,
        phone: "+213 557 33 22 11",
        workingHours: "السبت إلى الخميس (08:00 ص - 05:00 م)",
        bio: "خبرة طويلة في متابعة مرضى السكري وضغط الدم والاستشارات الطبية العامة.",
        rating: 4.8,
        reviewsCount: 50,
        gender: "male",
        avatarBg: "#d1fae5",
        reviews: [
            { author: "عبد القادر ن.", stars: 5, date: "قبل أسبوعين", comment: "طبيب العائلة الممتاز." }
        ]
    },
    {
        id: 8,
        name: "د. مريم أيت أحمد",
        specialty: "النساء والتوليد",
        title: "أخصائية أمراض النساء والتوليد والعقم وتأخر الحمل",
        city: "تيزي وزو",
        address: "حي Nouvelle Ville - عمارة الشفاء",
        price: 3800,
        currency: "د.ج",
        experienceYears: 17,
        phone: "+213 558 44 33 22",
        workingHours: "السبت إلى الأربعاء (09:00 ص - 04:00 م)",
        bio: "متابعة الحمل الخطر وإجراء عمليات التوليد بمركز الأمومة.",
        rating: 5.0,
        reviewsCount: 45,
        gender: "female",
        avatarBg: "#fbcfe8",
        reviews: [
            { author: "سميرة ك.", stars: 5, date: "قبل 3 أيام", comment: "دكتورة متفهمة ومحترفة للغاية." }
        ]
    },
    {
        id: 9,
        name: "د. عمر قاسمي",
        specialty: "جراحة العظام",
        title: "أخصائي علاج إصابات الملعب وجراحة المفاصل",
        city: "ورقلة",
        address: "حي الشط - مقابل صيدلية الولاية",
        price: 3000,
        currency: "د.ج",
        experienceYears: 10,
        phone: "+213 559 12 34 56",
        workingHours: "السبت إلى الخميس (08:30 ص - 04:30 م)",
        bio: "متخصص في العلاج الفيزيائي وإصابات العظام والمفاصل.",
        rating: 4.7,
        reviewsCount: 22,
        gender: "male",
        avatarBg: "#e0f2fe",
        reviews: [
            { author: "خالد ص.", stars: 5, date: "قبل 6 أيام", comment: "علاج رائع ومتابعة ممتازة." }
        ]
    }
];

const specialtiesList = [
    { name: "الكل", icon: "fa-hospital-user" },
    { name: "طب عام", icon: "fa-user-doctor" },
    { name: "طب الأطفال", icon: "fa-baby" },
    { name: "جراحة العظام", icon: "fa-bone" },
    { name: "طب الأسنان", icon: "fa-tooth" },
    { name: "طب وجراحة العيون", icon: "fa-eye" },
    { name: "الأمراض الجلدية", icon: "fa-hand-dots" },
    { name: "أمراض القلب", icon: "fa-heart-pulse" },
    { name: "النساء والتوليد", icon: "fa-person-pregnant" }
];

let currentSelectedDoctorId = null;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkPlatformAndSetMode();
    renderSpecialtyChips();
    populateSelectOptions();
    renderDoctors(doctorsData);
    setupEventListeners();
    initSupabase();
});

function checkPlatformAndSetMode() {
    const isCapacitor = (
        window.Capacitor?.isNativePlatform?.() ||
        window.Capacitor?.platform === 'android' ||
        window.Capacitor?.platform === 'ios' ||
        window.location.protocol === 'capacitor:' ||
        window.location.protocol === 'file:' ||
        /Capacitor/i.test(navigator.userAgent)
    );

    if (isCapacitor) {
        const wrapper = document.getElementById('app-wrapper');
        if (wrapper) {
            wrapper.className = 'app-mode native-app';
        }
        // Hide view mode toggle buttons inside APK so it stays exclusively in mobile app mode
        const modeToggle = document.querySelector('.view-mode-toggle');
        if (modeToggle) modeToggle.style.display = 'none';
    }
}

function renderSpecialtyChips() {
    const container = document.getElementById('specialties-chips-container');
    if (!container) return;

    container.innerHTML = specialtiesList.map(sp => `
        <div class="specialty-chip ${sp.name === 'الكل' ? 'active' : ''}" onclick="selectSpecialtyChip('${sp.name}', this)">
            <div class="specialty-chip-icon"><i class="fa-solid ${sp.icon}"></i></div>
            <span class="specialty-chip-text">${sp.name}</span>
        </div>
    `).join('');
}

function populateSelectOptions() {
    const specialtySelect = document.getElementById('filter-specialty');
    const citySelect = document.getElementById('filter-city');

    const specialties = [...new Set(doctorsData.map(d => d.specialty))];
    const cities = [...new Set(doctorsData.map(d => d.city))];

    if (specialtySelect) {
        specialtySelect.innerHTML = '<option value="">كل التخصصات</option>';
        specialties.forEach(sp => {
            const opt = document.createElement('option');
            opt.value = sp; opt.textContent = sp;
            specialtySelect.appendChild(opt);
        });
    }

    if (citySelect) {
        citySelect.innerHTML = '<option value="">كل المدن</option>';
        cities.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = c;
            citySelect.appendChild(opt);
        });
    }
}

function renderDoctors(list) {
    const grid = document.getElementById('doctors-grid');
    const emptyState = document.getElementById('empty-state');
    const countEl = document.getElementById('results-count');

    if (countEl) countEl.textContent = list.length;
    if (list.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    grid.innerHTML = list.map(doc => {
        const avatarSrc = generateDoctorAvatarSvg(doc.gender, doc.avatarBg);
        return `
            <div class="doctor-card" data-id="${doc.id}">
                <div class="doctor-card-top">
                    <div class="doctor-avatar-wrapper">
                        <img src="${avatarSrc}" alt="${doc.name}" class="doctor-avatar">
                        <div class="verified-badge"><i class="fa-solid fa-check"></i></div>
                    </div>
                    <div class="doctor-info-header">
                        <h3 class="doctor-name">${doc.name}</h3>
                        <div class="doctor-specialty-tag"><i class="fa-solid fa-stethoscope"></i> ${doc.specialty}</div>
                        <div class="doctor-rating-row">
                            <span class="stars-gold">${generateStars(doc.rating)}</span>
                            <span class="rating-score">${doc.rating.toFixed(1)}</span>
                            <span class="reviews-count">(${doc.reviewsCount} رأي)</span>
                        </div>
                    </div>
                </div>

                <div class="doctor-card-details">
                    <div class="detail-row"><i class="fa-solid fa-graduation-cap"></i> <span>خبرة ${doc.experienceYears} سنة في التخصص</span></div>
                    <div class="detail-row"><i class="fa-solid fa-location-dot"></i> <span>${doc.city} - ${doc.address.substring(0, 30)}...</span></div>
                    <div class="detail-row"><i class="fa-solid fa-money-bill-wave"></i> <span>سعر الكشف: <strong class="price-tag">${doc.price.toLocaleString()} ${doc.currency}</strong></span></div>
                </div>

                <div class="doctor-card-actions">
                    <button class="btn btn-outline" style="flex:1" onclick="openDoctorModal(${doc.id})"><i class="fa-solid fa-user-doctor"></i> الملف والتقييمات</button>
                    <button class="btn btn-primary" style="flex:1" onclick="openBookingModal(${doc.id})"><i class="fa-solid fa-calendar-check"></i> حجز موعد</button>
                </div>
            </div>
        `;
    }).join('');
}

function generateStars(rating) {
    let starsHtml = '';
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) starsHtml += '<i class="fa-solid fa-star"></i>';
    if (hasHalf) starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
    const emptyCount = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyCount; i++) starsHtml += '<i class="fa-regular fa-star"></i>';
    return starsHtml;
}

function filterDoctors() {
    const mainSearch = document.getElementById('main-search-input')?.value.trim().toLowerCase() || '';
    const heroSpecialty = document.getElementById('hero-specialty-select')?.value || '';
    const heroCity = document.getElementById('hero-city-select')?.value || '';
    
    const filterSpecialty = document.getElementById('filter-specialty')?.value || '';
    const filterCity = document.getElementById('filter-city')?.value || '';
    const maxPrice = parseInt(document.getElementById('filter-max-price')?.value) || 10000;
    const minRating = parseFloat(document.getElementById('filter-rating')?.value) || 0;
    const sortBy = document.getElementById('filter-sort')?.value || 'recommended';

    const selectedSpecialty = filterSpecialty || heroSpecialty;
    const selectedCity = filterCity || heroCity;

    let filtered = doctorsData.filter(doc => {
        const matchesSearch = !mainSearch || 
            doc.name.toLowerCase().includes(mainSearch) || 
            doc.specialty.toLowerCase().includes(mainSearch) ||
            doc.city.toLowerCase().includes(mainSearch) ||
            doc.address.toLowerCase().includes(mainSearch);

        const matchesSpecialty = !selectedSpecialty || doc.specialty === selectedSpecialty;
        const matchesCity = !selectedCity || doc.city === selectedCity;
        const matchesPrice = doc.price <= maxPrice;
        const matchesRating = doc.rating >= minRating;

        return matchesSearch && matchesSpecialty && matchesCity && matchesPrice && matchesRating;
    });

    if (sortBy === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') filtered.sort((a, b) => b.price - a.price);
    else if (sortBy === 'experience') filtered.sort((a, b) => b.experienceYears - a.experienceYears);
    else filtered.sort((a, b) => b.rating - a.rating);

    renderDoctors(filtered);
}

function selectSpecialtyChip(specialtyName, element) {
    document.querySelectorAll('.specialty-chip').forEach(c => c.classList.remove('active'));
    element.classList.add('active');

    const selectEl = document.getElementById('filter-specialty');
    if (selectEl) {
        selectEl.value = specialtyName === 'الكل' ? '' : specialtyName;
        filterDoctors();
    }
}

function resetAllFilters() {
    if (document.getElementById('main-search-input')) document.getElementById('main-search-input').value = '';
    if (document.getElementById('hero-specialty-select')) document.getElementById('hero-specialty-select').value = '';
    if (document.getElementById('hero-city-select')) document.getElementById('hero-city-select').value = '';
    if (document.getElementById('filter-specialty')) document.getElementById('filter-specialty').value = '';
    if (document.getElementById('filter-city')) document.getElementById('filter-city').value = '';
    if (document.getElementById('filter-max-price')) {
        document.getElementById('filter-max-price').value = 10000;
        document.getElementById('price-limit-display').textContent = '10,000 د.ج';
    }
    if (document.getElementById('filter-rating')) document.getElementById('filter-rating').value = '0';
    if (document.getElementById('filter-sort')) document.getElementById('filter-sort').value = 'recommended';

    document.querySelectorAll('.specialty-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.specialty-chip')?.classList.add('active');

    renderDoctors(doctorsData);
}

/* ====================================================
   MODALS LOGIC & MY APPOINTMENTS MODAL
   ==================================================== */
function openDoctorModal(docId) {
    const doc = doctorsData.find(d => d.id === docId);
    if (!doc) return;
    currentSelectedDoctorId = docId;

    const modal = document.getElementById('doctor-modal');
    const body = document.getElementById('doctor-modal-body');
    const avatarSrc = generateDoctorAvatarSvg(doc.gender, doc.avatarBg);

    body.innerHTML = `
        <div class="doc-modal-header">
            <img src="${avatarSrc}" alt="${doc.name}" class="doc-modal-avatar">
            <div class="doc-modal-title">
                <h2>${doc.name}</h2>
                <div class="doc-modal-badge">${doc.specialty}</div>
                <div class="doctor-rating-row">
                    <span class="stars-gold">${generateStars(doc.rating)}</span>
                    <span class="rating-score">${doc.rating.toFixed(1)}</span>
                    <span class="reviews-count">(${doc.reviewsCount} تقييم)</span>
                </div>
            </div>
        </div>

        <div class="doc-modal-info-grid">
            <div class="info-box"><h4><i class="fa-solid fa-money-bill-wave"></i> سعر الكشفية ومعاينة</h4><p class="price-highlight">${doc.price.toLocaleString()} ${doc.currency}</p></div>
            <div class="info-box"><h4><i class="fa-solid fa-clock"></i> أوقات العمل بالعيادة</h4><p style="font-size:0.9rem">${doc.workingHours}</p></div>
            <div class="info-box"><h4><i class="fa-solid fa-location-dot"></i> موقع العيادة والعنوان</h4><p style="font-size:0.9rem">${doc.city} - ${doc.address}</p></div>
            <div class="info-box"><h4><i class="fa-solid fa-phone"></i> رقم الهاتف المباشر</h4><p style="font-size:0.95rem; dir:ltr">${doc.phone}</p></div>
        </div>

        <div style="margin:1.5rem 0;">
            <h4 style="margin-bottom:6px; font-weight:800"><i class="fa-solid fa-circle-info"></i> نبذة عن الطبيب والخبرات</h4>
            <p style="color:var(--text-secondary); line-height:1.7">${doc.bio}</p>
        </div>

        <div class="reviews-list-container">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
                <h4 style="font-weight:800"><i class="fa-solid fa-comments"></i> آراء المرضى الموثقة (${doc.reviews.length})</h4>
                <button class="btn btn-outline" style="padding:4px 12px; font-size:0.85rem" onclick="openReviewModal(${doc.id})"><i class="fa-solid fa-plus"></i> أضف رأيك</button>
            </div>
            ${doc.reviews.length === 0 ? '<p style="color:var(--text-muted)">لا توجد تقييمات مكتوبة بعد، كن أول من يضيف تقييماً!</p>' : ''}
            ${doc.reviews.map(rev => `
                <div class="review-item">
                    <div class="review-item-header">
                        <span class="reviewer-name">${rev.author}</span>
                        <div><span class="stars-gold" style="font-size:0.8rem">${generateStars(rev.stars)}</span><span style="font-size:0.75rem; color:var(--text-muted); margin-right:6px">${rev.date}</span></div>
                    </div>
                    <p class="review-text">${rev.comment}</p>
                </div>
            `).join('')}
        </div>

        <div style="margin-top:2rem; display:flex; gap:12px">
            <button class="btn btn-primary btn-block" onclick="closeDoctorModal(); openBookingModal(${doc.id});"><i class="fa-solid fa-calendar-check"></i> احجز موعداً عند د. ${doc.name.split(' ')[1] || doc.name} الآن</button>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeDoctorModal() { document.getElementById('doctor-modal').classList.add('hidden'); }

function openBookingModal(docId) {
    const doc = doctorsData.find(d => d.id === docId);
    if (!doc) return;
    currentSelectedDoctorId = docId;

    document.getElementById('booking-doctor-name').textContent = `${doc.name} - ${doc.specialty} (${doc.city})`;
    document.getElementById('book-price-display').textContent = `${doc.price.toLocaleString()} ${doc.currency}`;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('book-date').valueAsDate = tomorrow;

    document.getElementById('booking-modal').classList.remove('hidden');
}

function closeBookingModal() { document.getElementById('booking-modal').classList.add('hidden'); }

// Render and open My Appointments Modal (with Cancel Button)
function renderMyAppointmentsModal() {
    const modal = document.getElementById('my-appointments-modal');
    const body = document.getElementById('my-appointments-body');

    if (userAppointments.length === 0) {
        body.innerHTML = `
            <div style="text-align:center; padding:3rem 1rem">
                <i class="fa-solid fa-calendar-xmark" style="font-size:3rem; color:var(--text-muted); margin-bottom:1rem"></i>
                <h3>لا توجد مواعيد محجوزة حالياً</h3>
                <p style="color:var(--text-secondary)">يمكنك تصفح قائمة الأطباء وحجز موعدك الأول بنقرة واحدة.</p>
            </div>
        `;
    } else {
        body.innerHTML = userAppointments.map(app => `
            <div style="background:var(--bg-main); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.25rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem">
                <div>
                    <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-primary)"><i class="fa-solid fa-user-md" style="color:var(--primary)"></i> ${app.doctorName}</h3>
                    <p style="font-size:0.88rem; color:var(--text-secondary); margin:4px 0">${app.specialty} | المريض: <strong>${app.patientName}</strong> (${app.patientPhone})</p>
                    <div style="display:flex; gap:12px; font-size:0.85rem; margin-top:6px">
                        <span><i class="fa-solid fa-calendar-day" style="color:var(--primary)"></i> ${app.date}</span>
                        <span><i class="fa-solid fa-clock" style="color:var(--primary)"></i> ${app.time}</span>
                        <span><i class="fa-solid fa-money-bill" style="color:var(--primary)"></i> ${app.price.toLocaleString()} د.ج</span>
                    </div>
                </div>
                <div>
                    ${app.status === 'ملغى' 
                        ? `<span style="background:rgba(244,63,94,0.15); color:var(--accent-rose); padding:6px 14px; border-radius:var(--radius-full); font-weight:800; font-size:0.85rem"><i class="fa-solid fa-ban"></i> موعد ملغى</span>`
                        : `<button class="btn btn-outline" style="border-color:var(--accent-rose); color:var(--accent-rose)" onclick="cancelAppointment('${app.id}')">
                            <i class="fa-solid fa-xmark"></i> إلغاء الموعد
                           </button>`
                    }
                </div>
            </div>
        `).join('');
    }

    modal.classList.remove('hidden');
}

function closeMyAppointmentsModal() { document.getElementById('my-appointments-modal').classList.add('hidden'); }

function openReviewModal(docId) {
    const doc = doctorsData.find(d => d.id === docId);
    if (!doc) return;
    currentSelectedDoctorId = docId;

    document.getElementById('review-doctor-name').textContent = `${doc.name} - ${doc.specialty}`;
    document.getElementById('review-modal').classList.remove('hidden');
}

function closeReviewModal() { document.getElementById('review-modal').classList.add('hidden'); }
function openRegisterModal() { document.getElementById('register-doctor-modal').classList.remove('hidden'); }
function closeRegisterModal() { document.getElementById('register-doctor-modal').classList.add('hidden'); }

function openSupabaseModal() {
    const urlInput = document.getElementById('sb-url-input');
    const keyInput = document.getElementById('sb-key-input');
    if (urlInput) urlInput.value = localStorage.getItem('alhakeem_sb_url') || '';
    if (keyInput) keyInput.value = localStorage.getItem('alhakeem_sb_key') || '';
    document.getElementById('supabase-modal').classList.remove('hidden');
}
function closeSupabaseModal() { document.getElementById('supabase-modal').classList.add('hidden'); }

/* ====================================================
   EVENT LISTENERS SETUP
   ==================================================== */
function setupEventListeners() {
    document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);
    document.getElementById('btn-web-mode')?.addEventListener('click', () => setViewMode('web'));
    document.getElementById('btn-app-mode')?.addEventListener('click', () => setViewMode('app'));

    document.getElementById('filter-max-price')?.addEventListener('input', (e) => {
        document.getElementById('price-limit-display').textContent = `${parseInt(e.target.value).toLocaleString()} د.ج`;
        filterDoctors();
    });

    document.getElementById('main-search-input')?.addEventListener('input', filterDoctors);
    document.getElementById('btn-hero-search')?.addEventListener('click', filterDoctors);
    document.getElementById('filter-specialty')?.addEventListener('change', filterDoctors);
    document.getElementById('filter-city')?.addEventListener('change', filterDoctors);
    document.getElementById('filter-rating')?.addEventListener('change', filterDoctors);
    document.getElementById('filter-sort')?.addEventListener('change', filterDoctors);
    document.getElementById('btn-reset-filters')?.addEventListener('click', resetAllFilters);

    document.getElementById('close-doctor-modal')?.addEventListener('click', closeDoctorModal);
    document.getElementById('close-booking-modal')?.addEventListener('click', closeBookingModal);
    document.getElementById('close-my-appointments-modal')?.addEventListener('click', closeMyAppointmentsModal);
    document.getElementById('close-review-modal')?.addEventListener('click', closeReviewModal);
    document.getElementById('close-register-modal')?.addEventListener('click', closeRegisterModal);
    document.getElementById('close-supabase-modal')?.addEventListener('click', closeSupabaseModal);

    document.getElementById('btn-open-my-appointments')?.addEventListener('click', renderMyAppointmentsModal);
    document.getElementById('btn-footer-my-appointments')?.addEventListener('click', (e) => { e.preventDefault(); renderMyAppointmentsModal(); });
    document.getElementById('mob-nav-appointments')?.addEventListener('click', (e) => { e.preventDefault(); renderMyAppointmentsModal(); });

    document.getElementById('btn-open-doctor-register')?.addEventListener('click', openRegisterModal);
    document.getElementById('btn-supabase-status')?.addEventListener('click', openSupabaseModal);
    document.getElementById('btn-footer-supabase')?.addEventListener('click', (e) => { e.preventDefault(); openSupabaseModal(); });

    document.querySelectorAll('#star-rating-selector .star-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const val = parseInt(this.getAttribute('data-value'));
            document.getElementById('review-stars-val').value = val;
            
            document.querySelectorAll('#star-rating-selector .star-btn').forEach(s => {
                const sVal = parseInt(s.getAttribute('data-value'));
                if (sVal <= val) s.classList.add('active');
                else s.classList.remove('active');
            });
        });
    });

    document.getElementById('supabase-config-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const url = document.getElementById('sb-url-input').value.trim();
        const key = document.getElementById('sb-key-input').value.trim();

        localStorage.setItem('alhakeem_sb_url', url);
        localStorage.setItem('alhakeem_sb_key', key);

        closeSupabaseModal();
        initSupabase();
        showToast('تم حفظ إعدادات Supabase وتفعيل الاتصال السحابي!', 'success');
    });

    // Booking Form Submit (with Supabase Sync & Appointments List Push)
    document.getElementById('booking-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const patientName = document.getElementById('book-patient-name').value;
        const phone = document.getElementById('book-patient-phone').value;
        const date = document.getElementById('book-date').value;
        const time = document.getElementById('book-time').value;
        const notes = document.getElementById('book-notes').value;
        const doc = doctorsData.find(d => d.id === currentSelectedDoctorId);

        const newAppointment = {
            id: 'app_' + Date.now(),
            doctorId: currentSelectedDoctorId,
            doctorName: doc ? doc.name : 'د. طبيب الحكيم',
            specialty: doc ? doc.specialty : 'طب عام',
            patientName: patientName,
            patientPhone: phone,
            date: date,
            time: time,
            notes: notes,
            status: 'مؤكد',
            price: doc ? doc.price : 3000
        };

        if (supabaseClient) {
            try {
                const { data } = await supabaseClient.from('appointments').insert([{
                    doctor_id: currentSelectedDoctorId,
                    patient_name: patientName,
                    patient_phone: phone,
                    appointment_date: date,
                    appointment_time: time,
                    notes: notes,
                    status: 'مؤكد'
                }]).select();

                if (data && data[0]) newAppointment.id = data[0].id;
            } catch (err) {
                console.error("Booking Supabase error:", err);
            }
        }

        userAppointments.unshift(newAppointment);
        localStorage.setItem('alhakeem_my_appointments', JSON.stringify(userAppointments));
        updateAppointmentsBadge();

        closeBookingModal();
        showToast(`تم تأكيد حجز الموعد بنجاح وحفظه سحابياً للمريض (${patientName}) عند د. ${doc ? doc.name : ''}`, 'success');
        this.reset();
    });

    document.getElementById('review-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const author = document.getElementById('review-author').value;
        const comment = document.getElementById('review-comment').value;
        const stars = parseInt(document.getElementById('review-stars-val').value);

        const doc = doctorsData.find(d => d.id === currentSelectedDoctorId);
        if (doc) {
            doc.reviews.unshift({ author: author, stars: stars, date: "الآن", comment: comment });
            doc.reviewsCount += 1;
            const sum = doc.reviews.reduce((acc, r) => acc + r.stars, 0);
            doc.rating = sum / doc.reviews.length;
        }

        if (supabaseClient) {
            await supabaseClient.from('reviews').insert([{
                doctor_id: currentSelectedDoctorId,
                author: author,
                stars: stars,
                comment: comment
            }]);
        }

        closeReviewModal();
        if (doc) openDoctorModal(doc.id);
        renderDoctors(doctorsData);
        showToast('تم إضافة التقييم ونشره سحابياً بنجاح!', 'success');
        this.reset();
    });
}

function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById('theme-toggle-btn');
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
}

function initTheme() { document.body.classList.add('light-theme'); }

function setViewMode(mode) {
    const wrapper = document.getElementById('app-wrapper');
    const webBtn = document.getElementById('btn-web-mode');
    const appBtn = document.getElementById('btn-app-mode');

    if (mode === 'app') {
        wrapper.className = 'app-mode';
        webBtn?.classList.remove('active');
        appBtn?.classList.add('active');
        showToast('عرض تطبيق الجوال (Mobile App View)', 'info');
    } else {
        wrapper.className = 'web-mode';
        appBtn?.classList.remove('active');
        webBtn?.classList.add('active');
        showToast('عرض الموقع الإلكتروني (Website View)', 'info');
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
