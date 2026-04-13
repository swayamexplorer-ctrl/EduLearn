import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate, 
  useParams,
  Navigate
} from 'react-router-dom';
import { 
  Search, Play, Star, Check, User, Mail, Github, Twitter, Linkedin, 
  Menu, X, ChevronDown, LogOut, BookOpen, Clock, Award, ChevronRight,
  Lock, Eye, EyeOff, ArrowLeft
} from 'lucide-react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  collection,
  query,
  where,
  arrayUnion
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';

// --- Types ---
interface Course {
  id: string;
  title: string;
  instructor: string;
  price: string;
  rating: number;
  duration: string;
  img: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  introVideoUrl: string;
  outcomes: string[];
  prerequisites: string[];
  playlist: { id: string; title: string; videoUrl: string; duration: string }[];
}

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  enrolledCourses: string[];
  progress: Record<string, number>;
  playlists: Record<string, string[]>; // courseId -> array of lessonIds
  recentlyViewed: string[];
}

// --- Mock Data ---
const COURSES: Course[] = [
  { 
    id: '1', 
    title: "Web Development Bootcamp", 
    instructor: "Sarah Johnson", 
    price: "Free", 
    rating: 4.9, 
    duration: "12 hours", 
    img: "code", 
    level: 'Beginner',
    description: "Learn full-stack web development from scratch. This comprehensive course covers HTML, CSS, JavaScript, and modern frameworks like React and Node.js.", 
    introVideoUrl: "https://www.youtube.com/embed/qz0aGYMCzl0",
    outcomes: ["Build responsive websites", "Master JavaScript ES6+", "Deploy full-stack apps"],
    prerequisites: ["Basic computer literacy", "No prior coding experience required"],
    playlist: [
      { id: '1-1', title: "Introduction to HTML", videoUrl: "https://www.youtube.com/embed/qz0aGYMCzl0", duration: "15:00" },
      { id: '1-2', title: "CSS Fundamentals", videoUrl: "https://www.youtube.com/embed/1Rs2ND1RYYc", duration: "25:00" },
      { id: '1-3', title: "JavaScript Basics", videoUrl: "https://www.youtube.com/embed/W6NZfCO5SIk", duration: "45:00" }
    ]
  },
  { 
    id: '2', 
    title: "UI/UX Design Masterclass", 
    instructor: "Michael Chen", 
    price: "Free", 
    rating: 4.8, 
    duration: "15 hours", 
    img: "design", 
    level: 'Intermediate',
    description: "Master the art of user interface and experience design. Learn industry-standard tools like Figma and Adobe XD while building a professional portfolio.", 
    introVideoUrl: "https://www.youtube.com/embed/qz0aGYMCzl0",
    outcomes: ["Create high-fidelity prototypes", "Conduct user research", "Master Figma components"],
    prerequisites: ["Basic understanding of design", "A creative mindset"],
    playlist: [
      { id: '2-1', title: "Design Principles", videoUrl: "https://www.youtube.com/embed/qz0aGYMCzl0", duration: "20:00" },
      { id: '2-2', title: "Figma Basics", videoUrl: "https://www.youtube.com/embed/1Rs2ND1RYYc", duration: "30:00" }
    ]
  },
  { 
    id: '3', 
    title: "Data Science Fundamentals", 
    instructor: "Dr. Emily Smith", 
    price: "Free", 
    rating: 4.7, 
    duration: "20 hours", 
    img: "data", 
    level: 'Advanced',
    description: "Dive into data analysis and machine learning. Learn how to process large datasets and build predictive models using Python and R.", 
    introVideoUrl: "https://www.youtube.com/embed/qz0aGYMCzl0",
    outcomes: ["Analyze complex datasets", "Build ML models", "Visualize data with D3.js"],
    prerequisites: ["Basic Python knowledge", "Mathematics (Linear Algebra)"],
    playlist: [
      { id: '3-1', title: "Python for Data Science", videoUrl: "https://www.youtube.com/embed/qz0aGYMCzl0", duration: "40:00" }
    ]
  },
];

// --- Components ---

function Navbar({ user, userData }: { user: any, userData: UserData | null }) {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl">E</div>
          <span className="text-2xl font-display font-bold text-slate-900 tracking-tight">EduLearn</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="font-medium text-slate-600 hover:text-primary transition-colors">Home</Link>
          <Link to="/#courses" className="font-medium text-slate-600 hover:text-primary transition-colors">Courses</Link>
          {user && <Link to="/dashboard" className="font-medium text-slate-600 hover:text-primary transition-colors">Dashboard</Link>}
        </div>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="relative group">
              <button className="flex items-center gap-2 font-semibold text-slate-700 hover:text-primary py-2 cursor-pointer">
                <img src={user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`} className="w-8 h-8 rounded-full" />
                {userData?.displayName || user.displayName || 'User'} <ChevronDown size={16} />
              </button>
              <div className="absolute right-0 top-full pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-2 w-48">
                  <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium">
                    <User size={16} /> Profile
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-red-50 text-red-600 font-medium">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link to="/login" className="font-semibold text-slate-700 hover:text-primary">Login</Link>
              <Link to="/signup" className="btn btn-primary px-5 py-2.5 rounded-xl text-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function VideoModal({ videoUrl, isOpen, onClose }: { videoUrl: string, isOpen: boolean, onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-10"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X size={24} />
            </button>
            <iframe 
              src={videoUrl} 
              className="w-full h-full" 
              allowFullScreen 
              title="Video Player"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LandingPage() {
  const [modalVideo, setModalVideo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredCourses = COURSES.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.instructor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-grow"
    >
      <VideoModal 
        isOpen={!!modalVideo} 
        videoUrl={modalVideo || ''} 
        onClose={() => setModalVideo(null)} 
      />

      {/* Hero Header */}
      <section id="home" className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-blue-700 text-white py-24 lg:py-32">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="text-left">
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold tracking-widest uppercase mb-6"
              >
                🚀 Empowering 10,000+ Students Worldwide
              </motion.div>
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-5xl lg:text-8xl font-display font-bold mb-6 leading-[0.9] tracking-tighter"
              >
                Master Skills <br />
                <span className="text-accent">EduLearn Hub</span>
              </motion.h1>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-xl text-blue-10/80 max-w-2xl mb-10 leading-relaxed"
              >
                Access 100+ recorded video playlists, expert instructors, and industry-recognized certifications to accelerate your career.
              </motion.p>
              
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-6"
              >
                <div className="relative w-full max-w-md group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses..." 
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-white/20 shadow-xl transition-all"
                  />
                </div>
                <button 
                  onClick={() => document.getElementById('courses')?.scrollIntoView()}
                  className="btn btn-accent w-full sm:w-auto h-[56px] px-8 shadow-lg shadow-accent/20"
                >
                  Start Learning Free
                </button>
              </motion.div>
            </div>

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="relative"
            >
              <div className="relative z-10 rounded-[40px] overflow-hidden shadow-2xl border-8 border-white/10 aspect-video group cursor-pointer" onClick={() => setModalVideo('https://www.youtube.com/embed/qz0aGYMCzl0')}>
                <img 
                  src="https://picsum.photos/seed/learning/800/450" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-primary shadow-2xl group-hover:scale-110 transition-transform">
                    <Play size={32} fill="currentColor" />
                  </div>
                </div>
              </div>
              {/* Floating Stats */}
              <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-3xl shadow-2xl text-slate-900 hidden md:block border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-primary">
                    <Award size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Certified Platform</p>
                    <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Industry Recognized</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Overview Video Section */}
      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-slate-900 rounded-[48px] p-8 md:p-20 shadow-2xl overflow-hidden relative text-white">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent pointer-events-none"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
              <div>
                <div className="text-accent font-bold tracking-widest uppercase text-xs mb-4">Quick Walkthrough</div>
                <h2 className="text-4xl lg:text-5xl mb-8 leading-tight">Explore All Courses <br />in 2 Minutes</h2>
                <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                  Get a quick walkthrough of our platform, our curriculum, and how you can start your journey to becoming a professional developer or designer.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 text-accent rounded-xl flex items-center justify-center"><Check size={20} /></div>
                    <span className="font-semibold text-sm">100% Free Access</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 text-accent rounded-xl flex items-center justify-center"><Check size={20} /></div>
                    <span className="font-semibold text-sm">Expert Playlists</span>
                  </div>
                </div>
              </div>
              <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl group cursor-pointer" onClick={() => setModalVideo('https://www.youtube.com/embed/qz0aGYMCzl0')}>
                <img src="https://picsum.photos/seed/overview/800/450" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                    <Play size={24} fill="currentColor" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses Grid */}
      <section id="courses" className="section-padding">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div>
            <div className="text-primary font-bold tracking-widest uppercase text-xs mb-4">Course Catalog</div>
            <h2 className="text-4xl lg:text-5xl mb-4 tracking-tight">Our Popular Courses</h2>
            <p className="text-slate-500 max-w-xl text-lg">Choose from our wide range of free courses and start building your future today.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-8 py-3 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-1">All</button>
            <button className="px-8 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 font-bold transition-all hover:-translate-y-1">Design</button>
            <button className="px-8 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 font-bold transition-all hover:-translate-y-1">Coding</button>
          </div>
        </div>
        
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} onPreview={() => setModalVideo('https://www.youtube.com/embed/qz0aGYMCzl0')} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
            <Search size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl mb-2 font-bold">No courses found</h3>
            <p className="text-slate-500">Try searching for something else.</p>
          </div>
        )}
      </section>

      {/* Testimonials */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-primary font-bold tracking-widest uppercase text-xs mb-4">Testimonials</div>
            <h2 className="text-4xl lg:text-5xl mb-4 tracking-tight">What Our Students Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Alex Johnson", role: "Web Developer", text: "EduLearn Hub changed my life. The courses are high quality and completely free!", img: "1" },
              { name: "Maria Garcia", role: "UI Designer", text: "Mastering Figma was so easy with the UI/UX masterclass. Highly recommended!", img: "2" },
              { name: "David Smith", role: "Data Scientist", text: "The data science fundamentals course gave me the perfect start to my career.", img: "3" }
            ].map((t, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white p-10 rounded-[32px] shadow-xl border border-slate-100"
              >
                <div className="flex gap-1 text-accent mb-6">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                </div>
                <p className="text-slate-600 italic mb-8 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <img src={`https://i.pravatar.cc/150?u=${t.img}`} className="w-12 h-12 rounded-full" />
                  <div>
                    <p className="font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-primary rounded-[48px] p-8 md:p-20 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent)] pointer-events-none"></div>
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-4xl lg:text-5xl mb-6 font-display font-bold">Ready to Start Learning?</h2>
              <p className="text-blue-100 text-lg mb-10">Join 10,000+ students and get the latest course updates directly in your inbox.</p>
              <form className="flex flex-col sm:flex-row gap-4" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="flex-grow px-8 py-4 rounded-2xl bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-white/20 shadow-xl"
                  required
                />
                <button className="btn btn-accent px-10 shadow-xl shadow-accent/20">Subscribe Now</button>
              </form>
              <p className="mt-6 text-sm text-blue-200">No spam, only high-quality educational content.</p>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function CourseCard({ course, onPreview }: { course: Course, onPreview: () => void, key?: string }) {
  const navigate = useNavigate();
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="card group"
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={`https://picsum.photos/seed/${course.img}/600/400`} 
          alt={course.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-primary shadow-sm">
          {course.price}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
          className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary shadow-xl">
            <Play size={20} fill="currentColor" />
          </div>
        </button>
      </div>
      <div className="p-6">
        <h3 className="text-xl mb-2 group-hover:text-primary transition-colors">{course.title}</h3>
        <p className="text-sm text-slate-500 mb-4">{course.instructor}</p>
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-sm text-slate-400 font-medium">{course.duration}</span>
          <button 
            onClick={() => navigate(`/course/${course.id}`)}
            className="btn btn-primary px-4 py-2 text-xs rounded-lg"
          >
            Enroll Now
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-grow flex items-center justify-center bg-slate-50 px-6 py-12"
    >
      <div className="card p-8 max-w-md w-full">
        <h2 className="text-3xl font-display font-bold mb-2 text-center">Welcome Back</h2>
        <p className="text-slate-500 text-center mb-8">Login to continue your learning journey</p>
        
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium">{error}</div>}
        {message && <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-6 text-sm font-medium">{message}</div>}
        
        <form onSubmit={handleLogin} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="name@example.com"
              required
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-semibold text-slate-700">Password</label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="text-xs font-bold text-primary hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary w-full py-4 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-400">Or continue with</span></div>
        </div>

        <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-semibold text-slate-700">
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" /> Google
        </button>

        <p className="text-center mt-8 text-slate-500">
          Don't have an account? <Link to="/signup" className="text-primary font-bold">Sign Up</Link>
        </p>
      </div>
    </motion.div>
  );
}

function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCred.user, { displayName: name });
      
      // Initialize user doc
      await setDoc(doc(db, 'users', userCred.user.uid), {
        uid: userCred.user.uid,
        email,
        displayName: name,
        enrolledCourses: [],
        progress: {},
        playlists: {},
        recentlyViewed: []
      });
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-grow flex items-center justify-center bg-slate-50 px-6 py-12"
    >
      <div className="card p-8 max-w-md w-full">
        <h2 className="text-3xl font-display font-bold mb-2 text-center">Create Account</h2>
        <p className="text-slate-500 text-center mb-8">Start your learning journey today</p>
        
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium">{error}</div>}
        
        <form onSubmit={handleSignup} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="name@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary w-full py-4 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500">
          Already have an account? <Link to="/login" className="text-primary font-bold">Login</Link>
        </p>
      </div>
    </motion.div>
  );
}

function Dashboard({ user, userData }: { user: any, userData: UserData | null }) {
  const navigate = useNavigate();
  const enrolledCourses = COURSES.filter(c => userData?.enrolledCourses.includes(c.id));
  const recentlyViewedCourses = COURSES.filter(c => userData?.recentlyViewed?.includes(c.id));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="section-padding flex-grow"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
        <div>
          <h1 className="text-4xl lg:text-5xl mb-3 tracking-tight">Welcome back, {userData?.displayName || 'Learner'}!</h1>
          <p className="text-slate-500 text-lg">You have {enrolledCourses.length} active courses in your library.</p>
        </div>
        <div className="flex gap-6">
          <motion.div 
            whileHover={{ y: -5 }}
            className="p-6 bg-white rounded-[32px] shadow-xl border border-slate-100 flex items-center gap-6 min-w-[200px]"
          >
            <div className="w-14 h-14 bg-blue-100 text-primary rounded-2xl flex items-center justify-center"><BookOpen size={28} /></div>
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enrolled</p><p className="text-2xl font-bold">{enrolledCourses.length}</p></div>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="p-6 bg-white rounded-[32px] shadow-xl border border-slate-100 flex items-center gap-6 min-w-[200px]"
          >
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center"><Award size={28} /></div>
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Certificates</p><p className="text-2xl font-bold">0</p></div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <div className="lg:col-span-3 space-y-16">
          {/* Enrolled Courses */}
          <section>
            <h2 className="text-2xl mb-8 font-bold flex items-center gap-3">
              <Play size={24} className="text-primary" /> My Courses
            </h2>
            {enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {enrolledCourses.map(course => (
                  <motion.div 
                    key={course.id} 
                    whileHover={{ y: -5 }}
                    className="card group"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img src={`https://picsum.photos/seed/${course.img}/600/400`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Link to={`/player/${course.id}`} className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-primary shadow-xl"><Play size={24} fill="currentColor" /></Link>
                      </div>
                    </div>
                    <div className="p-8">
                      <h3 className="text-xl mb-6 font-bold">{course.title}</h3>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Course Progress</span>
                        <span className="text-sm font-bold text-primary">{userData?.progress[course.id] || 0}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-8">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${userData?.progress[course.id] || 0}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                        ></motion.div>
                      </div>
                      <Link to={`/player/${course.id}`} className="btn btn-primary w-full py-4 rounded-2xl">Continue Learning</Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-slate-50 rounded-[48px] border-2 border-dashed border-slate-200">
                <BookOpen size={64} className="mx-auto text-slate-300 mb-6" />
                <h3 className="text-2xl mb-3 font-bold">No courses enrolled yet</h3>
                <p className="text-slate-500 mb-10 text-lg">Browse our catalog and start learning today!</p>
                <button 
                  onClick={() => {
                    navigate('/');
                    setTimeout(() => document.getElementById('courses')?.scrollIntoView(), 100);
                  }}
                  className="btn btn-primary px-10"
                >
                  Explore Courses
                </button>
              </div>
            )}
          </section>

          {/* Saved Playlists */}
          <section>
            <h2 className="text-2xl mb-8 font-bold flex items-center gap-3">
              <Star size={24} className="text-accent" /> Saved Playlists
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {Object.entries(userData?.playlists || {}).map(([courseId, lessonIds]) => {
                const course = COURSES.find(c => c.id === courseId);
                if (!course || lessonIds.length === 0) return null;
                return (
                  <motion.div key={courseId} whileHover={{ y: -5 }} className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-100 flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md">
                      <img src={`https://picsum.photos/seed/${course.img}/200/200`} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold mb-1">{course.title} Playlist</h4>
                      <p className="text-sm text-slate-500 mb-3">{lessonIds.length} lessons saved</p>
                      <Link to={`/player/${courseId}`} className="text-primary font-bold text-sm hover:underline">View Playlist</Link>
                    </div>
                  </motion.div>
                );
              })}
              {Object.keys(userData?.playlists || {}).length === 0 && (
                <div className="col-span-2 py-12 text-center bg-slate-50 rounded-[32px] border border-slate-100">
                  <p className="text-slate-500">No playlists saved yet. Add lessons while watching!</p>
                </div>
              )}
            </div>
          </section>

          {/* Recently Viewed */}
          <section>
            <h2 className="text-2xl mb-8 font-bold flex items-center gap-3">
              <Clock size={24} className="text-slate-400" /> Recently Viewed
            </h2>
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
              {recentlyViewedCourses.map(course => (
                <motion.div 
                  key={course.id} 
                  whileHover={{ y: -5 }}
                  className="min-w-[280px] bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-100"
                >
                  <img src={`https://picsum.photos/seed/${course.img}/400/200`} className="w-full h-40 object-cover" />
                  <div className="p-6">
                    <h4 className="font-bold mb-4 line-clamp-1">{course.title}</h4>
                    <Link to={`/course/${course.id}`} className="text-primary font-bold text-sm">View Course</Link>
                  </div>
                </motion.div>
              ))}
              {recentlyViewedCourses.length === 0 && (
                <div className="w-full py-12 text-center bg-slate-50 rounded-[32px] border border-slate-100">
                  <p className="text-slate-500">Your recently viewed courses will appear here.</p>
                </div>
              )}
            </div>
          </section>
        </div>
        
        <div className="lg:col-span-1 space-y-8">
          <section>
            <h2 className="text-2xl mb-8 font-bold">Profile Summary</h2>
            <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-100">
              <div className="text-center mb-8">
                <img src={user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-primary/10 p-1" />
                <h3 className="font-bold text-xl">{userData?.displayName || user.displayName}</h3>
                <p className="text-slate-500 text-sm">{user.email}</p>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Level</span>
                  <span className="font-bold text-primary">Beginner</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Points</span>
                  <span className="font-bold text-primary">1,250</span>
                </div>
              </div>
              <button className="w-full mt-10 text-slate-400 hover:text-red-600 font-bold text-sm transition-colors flex items-center justify-center gap-2" onClick={() => signOut(auth)}>
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-2xl mb-8 font-bold">Account Settings</h2>
            <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-100 space-y-4">
              <button onClick={() => navigate('/settings')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors group">
                <span className="font-bold text-slate-700">Edit Profile</span>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-primary" />
              </button>
              <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors group">
                <span className="font-bold text-slate-700">Change Password</span>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-primary" />
              </button>
              <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors group">
                <span className="font-bold text-slate-700">Notifications</span>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-primary" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

function CourseDetails({ user, userData }: { user: any, userData: UserData | null }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const course = COURSES.find(c => c.id === id);
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'instructor'>('overview');

  useEffect(() => {
    if (user && id) {
      const updateRecentlyViewed = async () => {
        const userRef = doc(db, 'users', user.uid);
        const currentViewed = userData?.recentlyViewed || [];
        const newViewed = [id, ...currentViewed.filter(cid => cid !== id)].slice(0, 5);
        await updateDoc(userRef, { recentlyViewed: newViewed });
      };
      updateRecentlyViewed();
    }
  }, [id, user]);

  if (!course) return <div className="section-padding text-center">Course not found</div>;

  const isEnrolled = userData?.enrolledCourses.includes(course.id);

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      enrolledCourses: arrayUnion(course.id)
    });
    navigate(`/player/${course.id}`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-grow"
    >
      {/* Course Header */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <span className="px-4 py-1.5 bg-primary rounded-full text-xs font-bold uppercase tracking-widest">{course.level}</span>
                <div className="flex items-center gap-1 text-accent">
                  <Star size={16} fill="currentColor" />
                  <span className="font-bold">{course.rating}</span>
                </div>
              </div>
              <h1 className="text-4xl lg:text-6xl font-display font-bold mb-6 leading-tight">{course.title}</h1>
              <p className="text-slate-400 text-lg mb-10 leading-relaxed max-w-xl">{course.description}</p>
              <div className="flex items-center gap-8 text-sm font-medium text-slate-300">
                <div className="flex items-center gap-2"><User size={18} className="text-primary" /> {course.instructor}</div>
                <div className="flex items-center gap-2"><Clock size={18} className="text-primary" /> {course.duration}</div>
                <div className="flex items-center gap-2"><Award size={18} className="text-primary" /> Certificate of Completion</div>
              </div>
            </div>
            <div className="relative aspect-video rounded-[40px] overflow-hidden shadow-2xl border-8 border-white/10">
              <iframe src={course.introVideoUrl} className="w-full h-full" allowFullScreen />
            </div>
          </div>
        </div>
      </section>

      {/* Course Content Tabs */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2">
              <div className="flex border-b border-slate-100 mb-10">
                {['overview', 'curriculum', 'instructor'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-8 py-4 font-bold text-sm uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {tab}
                    {activeTab === tab && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-12"
                  >
                    <div>
                      <h3 className="text-2xl font-bold mb-6">What you'll learn</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {course.outcomes.map((outcome, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"><Check size={14} /></div>
                            <span className="text-slate-600">{outcome}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-6">Prerequisites</h3>
                      <ul className="list-disc list-inside text-slate-600 space-y-2">
                        {course.prerequisites.map((pre, i) => <li key={i}>{pre}</li>)}
                      </ul>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'curriculum' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {course.playlist.map((lesson, i) => (
                      <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-lg transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 font-bold group-hover:text-primary">{i + 1}</div>
                          <div>
                            <p className="font-bold text-slate-700">{lesson.title}</p>
                            <p className="text-xs text-slate-400 font-medium">{lesson.duration}</p>
                          </div>
                        </div>
                        <Play size={18} className="text-slate-300 group-hover:text-primary" />
                      </div>
                    ))}
                  </motion.div>
                )}

                {activeTab === 'instructor' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-start gap-8"
                  >
                    <img src={`https://i.pravatar.cc/150?u=${course.instructor}`} className="w-24 h-24 rounded-3xl shadow-lg" />
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{course.instructor}</h3>
                      <p className="text-primary font-bold text-sm mb-4 uppercase tracking-widest">Senior Expert Instructor</p>
                      <p className="text-slate-600 leading-relaxed">
                        With over 10 years of experience in the industry, {course.instructor} has helped thousands of students master {course.title.split(' ')[0]} and build successful careers.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-32 bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100">
                <div className="text-4xl font-bold mb-8">{course.price}</div>
                <button 
                  onClick={handleEnroll}
                  className="btn btn-primary w-full py-5 rounded-2xl mb-6 text-lg"
                >
                  {isEnrolled ? 'Continue Learning' : 'Enroll Now'}
                </button>
                <p className="text-center text-slate-400 text-sm font-medium mb-8">Full Lifetime Access</p>
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Lessons</span>
                    <span className="font-bold">{course.playlist.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Duration</span>
                    <span className="font-bold">{course.duration}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Level</span>
                    <span className="font-bold">{course.level}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function CoursePlayer({ user, userData }: { user: any, userData: UserData | null }) {
  const { id } = useParams();
  const course = COURSES.find(c => c.id === id);
  const [activeVideo, setActiveVideo] = useState(0);

  if (!course || !course.playlist) return <div className="section-padding text-center">Course content not available</div>;

  const handleProgress = async (lessonIndex: number) => {
    if (!user || !id) return;
    const progress = Math.round(((lessonIndex + 1) / course.playlist.length) * 100);
    await updateDoc(doc(db, 'users', user.uid), {
      [`progress.${id}`]: progress
    });
  };

  const togglePlaylist = async (lessonId: string) => {
    if (!user || !id) return;
    const userRef = doc(db, 'users', user.uid);
    const currentPlaylist = userData?.playlists[id] || [];
    const isSaved = currentPlaylist.includes(lessonId);
    
    const newPlaylist = isSaved 
      ? currentPlaylist.filter(lid => lid !== lessonId)
      : [...currentPlaylist, lessonId];
      
    await updateDoc(userRef, {
      [`playlists.${id}`]: newPlaylist
    });
  };

  const isSaved = (lessonId: string) => userData?.playlists[id || '']?.includes(lessonId);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-grow bg-slate-900"
    >
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row h-[calc(100vh-80px)] overflow-hidden">
        <div className="flex-grow bg-black flex flex-col">
          <div className="flex-grow relative">
            <iframe 
              src={course.playlist[activeVideo].videoUrl} 
              className="w-full h-full" 
              allowFullScreen 
              title={course.playlist[activeVideo].title}
            />
          </div>
          <div className="bg-white p-8 border-t border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-display font-bold mb-2">{course.playlist[activeVideo].title}</h1>
                <p className="text-slate-500 font-medium">{course.title} • Lesson {activeVideo + 1}</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => togglePlaylist(course.playlist[activeVideo].id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${isSaved(course.playlist[activeVideo].id) ? 'bg-accent text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  <Star size={18} fill={isSaved(course.playlist[activeVideo].id) ? 'currentColor' : 'none'} />
                  {isSaved(course.playlist[activeVideo].id) ? 'Saved' : 'Save to Playlist'}
                </button>
                <button 
                  onClick={() => {
                    if (activeVideo < course.playlist.length - 1) {
                      setActiveVideo(prev => prev + 1);
                      handleProgress(activeVideo + 1);
                    }
                  }}
                  className="btn btn-primary px-8 py-3 rounded-xl"
                  disabled={activeVideo === course.playlist.length - 1}
                >
                  Next Lesson
                </button>
              </div>
            </div>
            <div className="flex items-center gap-6 text-slate-400 text-sm font-medium">
              <span className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg"><User size={16} className="text-primary" /> {course.instructor}</span>
              <span className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg"><Clock size={16} className="text-primary" /> {course.playlist[activeVideo].duration}</span>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-[400px] bg-white border-l border-slate-100 flex flex-col overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-white sticky top-0 z-10">
            <h2 className="text-2xl font-bold mb-6">Course Content</h2>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase mb-3 tracking-widest">
              <span>Your Progress</span>
              <span className="text-primary">{userData?.progress[id || ''] || 0}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${userData?.progress[id || ''] || 0}%` }}
                className="h-full bg-primary transition-all duration-500"
              ></motion.div>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-2">
            {course.playlist.map((item, i) => (
              <button 
                key={i} 
                onClick={() => {
                  setActiveVideo(i);
                  handleProgress(i);
                }}
                className={`w-full flex items-start gap-4 p-5 rounded-2xl transition-all text-left group ${activeVideo === i ? 'bg-blue-50 border border-primary/10' : 'hover:bg-slate-50'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${activeVideo === i ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-400 group-hover:bg-white'}`}>
                  {activeVideo === i ? <Play size={16} fill="currentColor" /> : i + 1}
                </div>
                <div className="flex-grow">
                  <h4 className={`font-bold text-sm mb-1 ${activeVideo === i ? 'text-primary' : 'text-slate-700'}`}>{item.title}</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-medium">{item.duration}</p>
                    {isSaved(item.id) && <Star size={12} className="text-accent" fill="currentColor" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileSettings({ user, userData }: { user: any, userData: UserData | null }) {
  const [name, setName] = useState(userData?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(auth.currentUser!, { displayName: name });
      await updateDoc(doc(db, 'users', user.uid), { displayName: name });
      setMessage('Profile updated successfully!');
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="section-padding flex-grow flex items-center justify-center bg-slate-50"
    >
      <div className="card p-10 max-w-xl w-full">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-primary mb-8 font-bold text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className="text-3xl font-display font-bold mb-8">Account Settings</h2>
        
        {message && <div className="bg-green-50 text-green-600 p-4 rounded-2xl mb-8 text-sm font-bold">{message}</div>}

        <form onSubmit={handleUpdate} className="space-y-8">
          <div className="flex flex-col items-center mb-10">
            <div className="relative group">
              <img src={user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`} className="w-32 h-32 rounded-full border-4 border-white shadow-xl" />
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <span className="text-white text-xs font-bold uppercase tracking-widest">Change</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-widest">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-widest">Email Address</label>
            <input 
              type="email" 
              value={user.email}
              disabled
              className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed font-medium"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary w-full py-5 rounded-2xl text-lg shadow-xl shadow-primary/20"
          >
            {loading ? 'Updating...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const userDoc = doc(db, 'users', u.uid);
        const unsubDoc = onSnapshot(userDoc, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data() as UserData);
          }
          setLoading(false);
        });
        return () => unsubDoc();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} userData={userData} />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
            <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <SignupPage />} />
            <Route path="/dashboard" element={user ? <Dashboard user={user} userData={userData} /> : <Navigate to="/login" />} />
            <Route path="/settings" element={user ? <ProfileSettings user={user} userData={userData} /> : <Navigate to="/login" />} />
            <Route path="/course/:id" element={<CourseDetails user={user} userData={userData} />} />
            <Route path="/player/:id" element={user ? <CoursePlayer user={user} userData={userData} /> : <Navigate to="/login" />} />
          </Routes>
        </AnimatePresence>
        <footer className="bg-slate-900 text-white pt-20 pb-10 mt-auto">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-slate-500 text-sm">© 2026 EduLearn Hub. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

