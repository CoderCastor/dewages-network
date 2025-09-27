import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search,
  Filter,
  MapPin,
  Clock,
  IndianRupee,
  Calendar,
  User,
  CheckCircle,
  Star,
  Briefcase,
  Home,
  Truck,
  Users,
  Leaf,
  Sparkles,
  Shield,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';

const WorkerJobPage = () => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    jobCategories: [],
    minWage: 0,
    maxWage: 5000,
    workingHours: {
      start: '',
      end: ''
    },
    location: '',
    maxDistance: 50,
    experienceLevel: '',
    dateRange: {
      start: '',
      end: ''
    }
  });

  // Job categories with icons
  const jobCategoryIcons = {
    construction: Briefcase,
    delivery: Truck,
    domestic_help: Home,
    event_staffing: Users,
    agriculture: Leaf,
    cleaning: Sparkles,
    security: Shield,
    other: Briefcase
  };

  // Sample job data
  const sampleJobs = [
    {
      id: 1,
      title: "Construction Site Helper",
      company: "ABC Builders Pvt Ltd",
      category: "construction",
      location: "Shivaji Nagar, Pune",
      distance: 2.5,
      coordinates: [73.8567, 18.5204],
      dailyWage: 800,
      startTime: "08:00",
      endTime: "17:00",
      startDate: "2024-09-20",
      endDate: "2024-10-15",
      duration: "25 days",
      experienceLevel: "beginner",
      description: "Need helper for residential construction project. Work includes material handling, basic construction support.",
      requirements: ["Physical fitness", "Punctuality", "Basic construction knowledge"],
      rating: 4.5,
      totalReviews: 23,
      postedDate: "2024-09-18",
      urgentJob: true
    },
    {
      id: 2,
      title: "House Cleaning Service",
      company: "Clean Home Services",
      category: "cleaning",
      location: "Koregaon Park, Pune",
      distance: 5.2,
      coordinates: [73.8956, 18.5362],
      dailyWage: 500,
      startTime: "09:00",
      endTime: "13:00",
      startDate: "2024-09-22",
      endDate: "2024-09-22",
      duration: "1 day",
      experienceLevel: "beginner",
      description: "Regular house cleaning for 3BHK apartment. Weekly basis work available.",
      requirements: ["Cleaning experience", "Own cleaning supplies", "Reliability"],
      rating: 4.2,
      totalReviews: 18,
      postedDate: "2024-09-17",
      urgentJob: false
    },
    {
      id: 3,
      title: "Delivery Partner",
      company: "QuickFood Delivery",
      category: "delivery",
      location: "FC Road, Pune",
      distance: 3.8,
      coordinates: [73.8174, 18.5089],
      dailyWage: 600,
      startTime: "10:00",
      endTime: "22:00",
      startDate: "2024-09-19",
      endDate: "2024-12-19",
      duration: "3 months",
      experienceLevel: "intermediate",
      description: "Food delivery partner needed for evening shift. Own vehicle required.",
      requirements: ["Own two-wheeler", "Smartphone", "Driving license"],
      rating: 4.0,
      totalReviews: 45,
      postedDate: "2024-09-16",
      urgentJob: false
    },
    {
      id: 4,
      title: "Event Setup Assistant",
      company: "Royal Events",
      category: "event_staffing",
      location: "Hinjewadi, Pune",
      distance: 12.5,
      coordinates: [73.7870, 18.5912],
      dailyWage: 1200,
      startTime: "06:00",
      endTime: "23:00",
      startDate: "2024-09-25",
      endDate: "2024-09-27",
      duration: "3 days",
      experienceLevel: "experienced",
      description: "Wedding event setup and management. Long hours but good pay. Multiple events.",
      requirements: ["Event experience", "Physical fitness", "Team work"],
      rating: 4.7,
      totalReviews: 31,
      postedDate: "2024-09-15",
      urgentJob: true
    },
    {
      id: 5,
      title: "Security Guard",
      company: "SecureMax Security",
      category: "security",
      location: "Baner, Pune",
      distance: 8.3,
      coordinates: [73.7919, 18.5642],
      dailyWage: 700,
      startTime: "20:00",
      endTime: "08:00",
      startDate: "2024-09-21",
      endDate: "2024-12-21",
      duration: "3 months",
      experienceLevel: "intermediate",
      description: "Night shift security guard for residential complex. 12-hour shift.",
      requirements: ["Security experience", "Night shift availability", "Alertness"],
      rating: 4.3,
      totalReviews: 27,
      postedDate: "2024-09-14",
      urgentJob: false
    },
    {
      id: 6,
      title: "Farm Assistant",
      company: "Green Valley Farms",
      category: "agriculture",
      location: "Mulshi, Pune",
      distance: 25.0,
      coordinates: [73.5093, 18.5074],
      dailyWage: 450,
      startTime: "06:00",
      endTime: "14:00",
      startDate: "2024-09-20",
      endDate: "2024-10-30",
      duration: "40 days",
      experienceLevel: "beginner",
      description: "Seasonal farm work for vegetable harvesting. Transportation provided.",
      requirements: ["Physical fitness", "Early morning availability", "Agriculture interest"],
      rating: 4.1,
      totalReviews: 12,
      postedDate: "2024-09-13",
      urgentJob: false
    },
    {
      id: 7,
      title: "Warehouse Loader",
      company: "LogiTrack Warehousing",
      category: "logistics",
      location: "Chakan, Pune",
      distance: 12.3,
      coordinates: [73.8437, 18.7604],
      dailyWage: 700,
      startTime: "09:00",
      endTime: "18:00",
      startDate: "2024-09-25",
      endDate: "2024-10-20",
      duration: "26 days",
      experienceLevel: "beginner",
      description: "Loading and unloading goods in warehouse. Must be able to lift heavy weights safely.",
      requirements: ["Physical strength", "Teamwork", "Safety awareness"],
      rating: 4.2,
      totalReviews: 15,
      postedDate: "2024-09-22",
      urgentJob: false
    },
    {
      id: 8,
      title: "House Painter",
      company: "Shree Ganesh Paint Works",
      category: "painting",
      location: "Hadapsar, Pune",
      distance: 6.8,
      coordinates: [73.9345, 18.5089],
      dailyWage: 850,
      startTime: "09:00",
      endTime: "17:30",
      startDate: "2024-10-01",
      endDate: "2024-10-30",
      duration: "30 days",
      experienceLevel: "intermediate",
      description: "Painting residential houses. Must know brush and roller techniques.",
      requirements: ["Basic painting skills", "Attention to detail", "Safety precautions"],
      rating: 4.6,
      totalReviews: 18,
      postedDate: "2024-09-25",
      urgentJob: true
    },
    {
      id: 9,
      title: "Delivery Boy",
      company: "QuickKart Pvt Ltd",
      category: "delivery",
      location: "Kothrud, Pune",
      distance: 4.5,
      coordinates: [73.8070, 18.5074],
      dailyWage: 750,
      startTime: "10:00",
      endTime: "19:00",
      startDate: "2024-09-27",
      endDate: "2024-10-25",
      duration: "29 days",
      experienceLevel: "beginner",
      description: "Deliver groceries and parcels to customers within city area.",
      requirements: ["Driving license", "Two-wheeler", "Smartphone with GPS"],
      rating: 4.3,
      totalReviews: 27,
      postedDate: "2024-09-23",
      urgentJob: false
    },
    {
      id: 10,
      title: "Electrician Helper",
      company: "PowerFix Solutions",
      category: "electrical",
      location: "Nigdi, Pune",
      distance: 15.2,
      coordinates: [73.7684, 18.6510],
      dailyWage: 900,
      startTime: "08:30",
      endTime: "17:30",
      startDate: "2024-09-28",
      endDate: "2024-10-18",
      duration: "21 days",
      experienceLevel: "beginner",
      description: "Assist senior electricians in wiring, fitting, and maintenance work.",
      requirements: ["Basic electrical knowledge", "Safety awareness", "Quick learner"],
      rating: 4.7,
      totalReviews: 12,
      postedDate: "2024-09-24",
      urgentJob: true
    }
  ];

  useEffect(() => {
    setJobs(sampleJobs);
    setFilteredJobs(sampleJobs);
  }, []);

  useEffect(() => {
    filterJobs();
  }, [filters, searchTerm, jobs]);

  const filterJobs = () => {
    let filtered = jobs.filter(job => {
      // Search term filter
      const matchesSearch = searchTerm === '' || 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory = filters.jobCategories.length === 0 || 
        filters.jobCategories.includes(job.category);

      // Wage filter
      const matchesWage = job.dailyWage >= filters.minWage && 
        job.dailyWage <= filters.maxWage;

      // Location/Distance filter
      const matchesDistance = job.distance <= filters.maxDistance;

      // Experience level filter
      const matchesExperience = filters.experienceLevel === '' || 
        job.experienceLevel === filters.experienceLevel;

      // Working hours filter
      const matchesWorkingHours = 
        (filters.workingHours.start === '' || job.startTime >= filters.workingHours.start) &&
        (filters.workingHours.end === '' || job.endTime <= filters.workingHours.end);

      return matchesSearch && matchesCategory && matchesWage && 
             matchesDistance && matchesExperience && matchesWorkingHours;
    });

    setFilteredJobs(filtered);
  };

  const handleApplyJob = (jobId) => {
    setAppliedJobs(prev => new Set([...prev, jobId]));
    // Here you would typically make an API call to apply for the job
    console.log(`Applied for job ${jobId}`);
  };

  const updateFilter = (key, value) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setFilters(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const toggleJobCategory = (category) => {
    setFilters(prev => ({
      ...prev,
      jobCategories: prev.jobCategories.includes(category)
        ? prev.jobCategories.filter(cat => cat !== category)
        : [...prev.jobCategories, category]
    }));
  };

  const clearFilters = () => {
    setFilters({
      jobCategories: [],
      minWage: 0,
      maxWage: 5000,
      workingHours: { start: '', end: '' },
      location: '',
      maxDistance: 50,
      experienceLevel: '',
      dateRange: { start: '', end: '' }
    });
    setSearchTerm('');
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderJobCard = (job) => {
    const IconComponent = jobCategoryIcons[job.category] || Briefcase;
    const isApplied = appliedJobs.has(job.id);

    return (
      <motion.div
        key={job.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 p-6"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <IconComponent className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{job.company}</p>
              <div className="flex items-center text-sm text-gray-500">
                <Star className="w-4 h-4 text-yellow-400 mr-1" />
                <span className="mr-1">{job.rating}</span>
                <span>({job.totalReviews} reviews)</span>
              </div>
            </div>
          </div>
          {job.urgentJob && (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
              Urgent
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <IndianRupee className="w-4 h-4 mr-2" />
              <span className="font-semibold text-green-600">₹{job.dailyWage}/day</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span>{formatTime(job.startTime)} - {formatTime(job.endTime)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{job.duration}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-2" />
              <span className="capitalize">{job.experienceLevel}</span>
            </div>
            <div className="text-sm text-gray-500">
              {job.distance}km away
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{job.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {job.requirements.slice(0, 3).map((req, index) => (
            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
              {req}
            </span>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            Posted on {new Date(job.postedDate).toLocaleDateString()}
          </span>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleApplyJob(job.id)}
            disabled={isApplied}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isApplied 
                ? 'bg-green-100 text-green-800 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isApplied ? (
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Applied
              </div>
            ) : (
              'Apply Now'
            )}
          </motion.button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Find Jobs</h1>
              <p className="text-gray-600">Discover opportunities near you</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search jobs, companies, locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
                {showFilters ? (
                  <ChevronUp className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-2" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="lg:w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-purple-600 hover:text-purple-800"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Job Categories */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Job Categories</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(jobCategoryIcons).map(([category, IconComponent]) => (
                        <button
                          key={category}
                          onClick={() => toggleJobCategory(category)}
                          className={`flex items-center p-3 text-sm border rounded-lg transition-colors ${
                            filters.jobCategories.includes(category)
                              ? 'bg-purple-100 border-purple-500 text-purple-700'
                              : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          <IconComponent className="w-4 h-4 mr-2" />
                          <span className="capitalize">{category.replace('_', ' ')}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wage Range */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Wage Range</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Min (₹)</label>
                        <input
                          type="number"
                          value={filters.minWage}
                          onChange={(e) => updateFilter('minWage', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Max (₹)</label>
                        <input
                          type="number"
                          value={filters.maxWage}
                          onChange={(e) => updateFilter('maxWage', parseInt(e.target.value) || 5000)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Working Hours */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Working Hours</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={filters.workingHours.start}
                          onChange={(e) => updateFilter('workingHours.start', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">End Time</label>
                        <input
                          type="time"
                          value={filters.workingHours.end}
                          onChange={(e) => updateFilter('workingHours.end', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Distance */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Max Distance: {filters.maxDistance}km
                    </h3>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={filters.maxDistance}
                      onChange={(e) => updateFilter('maxDistance', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1km</span>
                      <span>50km</span>
                    </div>
                  </div>

                  {/* Experience Level */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Experience Level</h3>
                    <select
                      value={filters.experienceLevel}
                      onChange={(e) => updateFilter('experienceLevel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">All Levels</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="experienced">Experienced</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Jobs List */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredJobs.length} Jobs Found
              </h2>
              <div className="text-sm text-gray-500">
                {appliedJobs.size} applications sent
              </div>
            </div>

            <div className="grid gap-6">
              <AnimatePresence>
                {filteredJobs.length > 0 ? (
                  filteredJobs.map(renderJobCard)
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
                    <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerJobPage;