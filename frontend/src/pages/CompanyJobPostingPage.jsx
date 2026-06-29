import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus,
  Briefcase,
  Users,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  IndianRupee,
  MapPin,
  Calendar,
  Star,
  Info,
  Wallet,
  AlertCircle,
  Search,
  Filter,
  Home,
  Truck,
  Leaf,
  Sparkles,
  Shield,
  User,
  Phone,
  Mail,
  Award,
  Building,
  CreditCard,
  DollarSign,
  X,
  Send,
  FileText,
  Camera,
  ChevronDown,
  ThumbsUp,
  MessageCircle,
  TrendingUp,
  Target,
  Zap,
  Globe,
  Wrench,
  Hammer,
  Car,
  UtensilsCrossed,
  Paintbrush
} from 'lucide-react';
import { ClipLoader } from 'react-spinners';

const CompanyJobPostingPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWorkerInfoModal, setShowWorkerInfoModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [companyBalance, setCompanyBalance] = useState(15000);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Job posting form state
  const [jobForm, setJobForm] = useState({
    title: '',
    category: 'construction',
    description: '',
    requirements: [],
    location: {
      address: '',
      city: '',
      state: '',
      country: 'India'
    },
    dailyWage: 500,
    startTime: '09:00',
    endTime: '17:00',
    startDate: '',
    endDate: '',
    experienceLevel: 'beginner',
    totalPositions: 1,
    isUrgent: false,
    requiredSkills: []
  });

  const [jobFormErrors, setJobFormErrors] = useState({});
  const [availableSkills] = useState([
    'concrete work', 'electrical wiring', 'plumbing', 'tile installation', 
    'painting', 'carpentry', 'welding', 'cleaning', 'cooking', 'security',
    'gardening', 'driving', 'maintenance', 'manufacturing', 'packaging'
  ]);

  // Sample posted jobs with applications
  const [postedJobs, setPostedJobs] = useState([
    {
      id: 1,
      title: 'Construction Site Helper',
      category: 'construction',
      location: 'Shivaji Nagar, Pune',
      dailyWage: 800,
      startTime: '08:00',
      endTime: '17:00',
      startDate: '2024-09-20',
      endDate: '2024-10-15',
      totalPositions: 3,
      filledPositions: 1,
      status: 'active',
      postedDate: '2024-09-15',
      totalApplications: 12,
      pendingApplications: 7,
      approvedApplications: 1,
      rejectedApplications: 4,
      escrowAmount: 2400,
      description: 'Looking for reliable construction helpers for our ongoing project in Pune. Must be able to work in a team environment.',
      requiredSkills: ['concrete work', 'electrical wiring', 'plumbing'],
      experienceLevel: 'intermediate',
      applications: [
        {
          id: 1,
          workerName: 'Rajesh Kumar',
          walletAddress: '0x742d35Cc6862C0532c456018c3c6c0532c456012',
          phone: '+919876543210',
          email: 'rajesh.kumar@email.com',
          rating: 4.5,
          totalJobs: 23,
          completedJobs: 21,
          skills: ['concrete work', 'electrical wiring', 'plumbing'],
          experienceLevel: 'experienced',
          appliedDate: '2024-09-16',
          status: 'approved',
          location: 'Pune',
          distance: 2.5,
          bio: 'Experienced construction worker with 5+ years in the industry. Specialized in concrete work and electrical installations.',
          previousProjects: ['Mall Construction', 'Residential Complex', 'Office Building'],
          certifications: ['Safety Training Certificate', 'Electrical Work License']
        },
        {
          id: 2,
          workerName: 'Amit Sharma',
          walletAddress: '0x123d35Cc6862C0532c456018c3c6c0532c456789',
          phone: '+919876543211',
          email: 'amit.sharma@email.com',
          rating: 4.2,
          totalJobs: 15,
          completedJobs: 14,
          skills: ['concrete work', 'painting', 'tile installation'],
          experienceLevel: 'intermediate',
          appliedDate: '2024-09-17',
          status: 'pending',
          location: 'Pune',
          distance: 4.2,
          bio: 'Dedicated worker with expertise in multiple construction trades. Known for quality work and punctuality.',
          previousProjects: ['Housing Project', 'Commercial Building'],
          certifications: ['Basic Safety Training']
        },
        {
          id: 3,
          workerName: 'Vikram Patil',
          walletAddress: '0x456d35Cc6862C0532c456018c3c6c0532c456456',
          phone: '+919876543212',
          email: 'vikram.patil@email.com',
          rating: 3.8,
          totalJobs: 8,
          completedJobs: 7,
          skills: ['concrete work', 'carpentry'],
          experienceLevel: 'beginner',
          appliedDate: '2024-09-18',
          status: 'pending',
          location: 'Pune',
          distance: 1.8,
          bio: 'Enthusiastic beginner looking to gain more experience in construction work. Quick learner and reliable.',
          previousProjects: ['Small Residential Work', 'Garden Construction'],
          certifications: []
        }
      ]
    },
    {
      id: 2,
      title: 'Office Cleaning Service',
      category: 'cleaning',
      location: 'Koregaon Park, Pune',
      dailyWage: 500,
      startTime: '09:00',
      endTime: '13:00',
      startDate: '2024-09-25',
      endDate: '2024-12-25',
      totalPositions: 2,
      filledPositions: 0,
      status: 'active',
      postedDate: '2024-09-18',
      totalApplications: 8,
      pendingApplications: 6,
      approvedApplications: 0,
      rejectedApplications: 2,
      escrowAmount: 1000,
      description: 'Professional office cleaning service needed for our corporate office. Must maintain high hygiene standards.',
      requiredSkills: ['cleaning', 'organizing'],
      experienceLevel: 'beginner',
      applications: [
        {
          id: 4,
          workerName: 'Sunita Devi',
          walletAddress: '0x789d35Cc6862C0532c456018c3c6c0532c456789',
          phone: '+919876543213',
          email: 'sunita.devi@email.com',
          rating: 4.7,
          totalJobs: 32,
          completedJobs: 30,
          skills: ['cleaning', 'organizing'],
          experienceLevel: 'experienced',
          appliedDate: '2024-09-19',
          status: 'pending',
          location: 'Pune',
          distance: 3.1,
          bio: 'Professional cleaner with extensive experience in office and residential cleaning. Detail-oriented and trustworthy.',
          previousProjects: ['Corporate Offices', 'Hotels', 'Residential Complexes'],
          certifications: ['Professional Cleaning Certificate', 'Hygiene Training']
        }
      ]
    }
  ]);

  const jobCategoryIcons = {
    construction: Briefcase,
    plumbing: Wrench,
    electrical: Zap,
    carpentry: Hammer,
    painting: Paintbrush,
    delivery: Truck,
    driving: Car,
    domestic_help: Home,
    cooking: UtensilsCrossed,
    event_staffing: Users,
    agriculture: Leaf,
    cleaning: Sparkles,
    security: Shield,
    manufacturing: Building,
    other: Briefcase
  };

  const jobCategories = [
    { value: 'construction', label: 'Construction' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'carpentry', label: 'Carpentry' },
    { value: 'painting', label: 'Painting' },
    { value: 'delivery', label: 'Delivery & Logistics' },
    { value: 'driving', label: 'Driving / Transport' },
    { value: 'domestic_help', label: 'Domestic Help' },
    { value: 'cooking', label: 'Cooking / Kitchen' },
    { value: 'event_staffing', label: 'Event Staffing' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'cleaning', label: 'Cleaning Services' },
    { value: 'security', label: 'Security' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'other', label: 'Other' }
  ];

  const experienceLevels = [
    { value: 'beginner', label: 'Beginner (0-1 years)' },
    { value: 'intermediate', label: 'Intermediate (1-3 years)' },
    { value: 'experienced', label: 'Experienced (3+ years)' }
  ];

  const handleJobFormChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setJobForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setJobForm(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear errors
    if (jobFormErrors[field]) {
      setJobFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addSkillToJob = (skill) => {
    if (!jobForm.requiredSkills.includes(skill)) {
      setJobForm(prev => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, skill]
      }));
    }
  };

  const removeSkillFromJob = (skill) => {
    setJobForm(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter(s => s !== skill)
    }));
  };

  const addRequirement = () => {
    setJobForm(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
  };

  const updateRequirement = (index, value) => {
    setJobForm(prev => ({
      ...prev,
      requirements: prev.requirements.map((req, i) => i === index ? value : req)
    }));
  };

  const removeRequirement = (index) => {
    setJobForm(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const validateJobForm = () => {
    const errors = {};
    
    if (!jobForm.title.trim()) errors.title = 'Job title is required';
    if (!jobForm.description.trim()) errors.description = 'Job description is required';
    if (!jobForm.location.address.trim()) errors['location.address'] = 'Address is required';
    if (!jobForm.location.city.trim()) errors['location.city'] = 'City is required';
    if (!jobForm.location.state.trim()) errors['location.state'] = 'State is required';
    if (!jobForm.startDate) errors.startDate = 'Start date is required';
    if (!jobForm.endDate) errors.endDate = 'End date is required';
    if (jobForm.dailyWage < 100) errors.dailyWage = 'Minimum wage should be ₹100';
    if (jobForm.totalPositions < 1) errors.totalPositions = 'At least 1 position required';
    
    // Date validation
    const startDate = new Date(jobForm.startDate);
    const endDate = new Date(jobForm.endDate);
    const today = new Date();
    
    if (startDate < today) errors.startDate = 'Start date cannot be in the past';
    if (endDate <= startDate) errors.endDate = 'End date must be after start date';
    
    // Calculate total cost and check balance
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const totalCost = jobForm.dailyWage * days * jobForm.totalPositions;
    if (totalCost > companyBalance) {
      errors.balance = `Insufficient balance. Required: ₹${totalCost}, Available: ₹${companyBalance}`;
    }
    
    setJobFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePostJob = async () => {
    if (!validateJobForm()) return;
    
    setIsPostingJob(true);
    
    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const days = Math.ceil((new Date(jobForm.endDate) - new Date(jobForm.startDate)) / (1000 * 60 * 60 * 24)) + 1;
    const totalCost = jobForm.dailyWage * days * jobForm.totalPositions;
    
    // Deduct from balance
    setCompanyBalance(prev => prev - totalCost);
    
    // Add new job to posted jobs
    const newJob = {
      ...jobForm,
      id: Date.now(),
      location: `${jobForm.location.address}, ${jobForm.location.city}`,
      status: 'active',
      postedDate: new Date().toISOString().split('T')[0],
      totalApplications: 0,
      pendingApplications: 0,
      approvedApplications: 0,
      rejectedApplications: 0,
      filledPositions: 0,
      escrowAmount: totalCost,
      applications: []
    };
    
    setPostedJobs(prev => [newJob, ...prev]);
    setShowPostJobModal(false);
    setIsPostingJob(false);
    
    // Reset form
    setJobForm({
      title: '',
      category: 'construction',
      description: '',
      requirements: [],
      location: { address: '', city: '', state: '', country: 'India' },
      dailyWage: 500,
      startTime: '09:00',
      endTime: '17:00',
      startDate: '',
      endDate: '',
      experienceLevel: 'beginner',
      totalPositions: 1,
      isUrgent: false,
      requiredSkills: []
    });
    
    alert('Job posted successfully! Funds have been deposited to escrow.');
  };

  const handleApplicationAction = (jobId, applicationId, action) => {
    setPostedJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        const updatedApplications = job.applications.map(app => {
          if (app.id === applicationId) {
            return { ...app, status: action };
          }
          return app;
        });
        
        const pendingCount = updatedApplications.filter(app => app.status === 'pending').length;
        const approvedCount = updatedApplications.filter(app => app.status === 'approved').length;
        const rejectedCount = updatedApplications.filter(app => app.status === 'rejected').length;
        
        return {
          ...job,
          applications: updatedApplications,
          pendingApplications: pendingCount,
          approvedApplications: approvedCount,
          rejectedApplications: rejectedCount,
          filledPositions: approvedCount
        };
      }
      return job;
    }));
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (amount <= 0) return;
    
    setIsDepositing(true);
    
    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setCompanyBalance(prev => prev + amount);
    setDepositAmount('');
    setShowDepositModal(false);
    setIsDepositing(false);
    alert(`₹${amount} deposited successfully!`);
  };

  const showWorkerInfo = (worker) => {
    setSelectedWorker(worker);
    setShowWorkerInfoModal(true);
  };

  // Filter jobs based on search and status
  const filteredJobs = postedJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{postedJobs.filter(job => job.status === 'active').length}</p>
              <p className="text-xs text-green-600 mt-1">+2 this week</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">
                {postedJobs.reduce((sum, job) => sum + job.totalApplications, 0)}
              </p>
              <p className="text-xs text-green-600 mt-1">+5 today</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
              <p className="text-2xl font-bold text-gray-900">
                {postedJobs.reduce((sum, job) => sum + job.pendingApplications, 0)}
              </p>
              <p className="text-xs text-yellow-600 mt-1">Needs attention</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Balance</p>
              <p className="text-2xl font-bold text-green-600">₹{companyBalance.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Available for escrow</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Wallet className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowPostJobModal(true)}
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Post New Job</h3>
                <p className="text-sm text-gray-600">Create and publish job listing</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setShowDepositModal(true)}
            className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Add Funds</h3>
                <p className="text-sm text-gray-600">Deposit money to your wallet</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Review Applications</h3>
                <p className="text-sm text-gray-600">Check pending applications</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Job Posts</h2>
            <button
              onClick={() => setActiveTab('jobs')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {postedJobs.slice(0, 3).map((job, index) => {
            const IconComponent = jobCategoryIcons[job.category];
            return (
              <motion.div 
                key={job.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <IconComponent className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {job.location}
                        </span>
                        <span className="flex items-center">
                          <IndianRupee className="w-4 h-4 mr-1" />
                          ₹{job.dailyWage}/day
                        </span>
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {job.filledPositions}/{job.totalPositions} filled
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">{job.totalApplications} applications</div>
                    {job.pendingApplications > 0 && (
                      <span className="inline-flex px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        {job.pendingApplications} pending
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderJobsTab = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search jobs by title or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-6">
        {filteredJobs.map((job, index) => {
          const IconComponent = jobCategoryIcons[job.category];
          return (
            <motion.div 
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Job Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <IconComponent className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                        {job.isUrgent && (
                          <span className="inline-flex px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            <Zap className="w-3 h-3 mr-1" />
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{job.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          {job.location}
                        </div>
                        <div className="flex items-center">
                          <IndianRupee className="w-4 h-4 mr-2" />
                          ₹{job.dailyWage}/day
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          {job.startTime} - {job.endTime}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          {job.filledPositions}/{job.totalPositions} positions
                        </div>
                      </div>
                      {job.requiredSkills && job.requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {job.requiredSkills.map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                      job.status === 'active' ? 'bg-green-100 text-green-800' : 
                      job.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status}
                    </span>
                    <div className="text-sm text-gray-500 mt-2">
                      Posted {new Date(job.postedDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm font-medium text-purple-600 mt-1">
                      Escrow: ₹{job.escrowAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Applications Section */}
              {job.applications.length > 0 && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Applications ({job.applications.length})
                    </h4>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-yellow-600">
                        {job.pendingApplications} pending
                      </span>
                      <span className="text-green-600">
                        {job.approvedApplications} approved
                      </span>
                      <span className="text-red-600">
                        {job.rejectedApplications} rejected
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {job.applications.map((application, appIndex) => (
                      <motion.div 
                        key={application.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: appIndex * 0.1 }}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {application.workerName.charAt(0)}
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900">{application.workerName}</h5>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 mr-1" />
                                {application.rating} ({application.completedJobs} jobs)
                              </div>
                              <span className="capitalize">{application.experienceLevel}</span>
                              <span>{application.distance}km away</span>
                              <span className="text-xs text-gray-500">
                                Applied {new Date(application.appliedDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {application.skills.slice(0, 3).map((skill, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  {skill}
                                </span>
                              ))}
                              {application.skills.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  +{application.skills.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => showWorkerInfo(application)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View worker details"
                          >
                            <Info className="w-5 h-5" />
                          </button>
                          
                          {application.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApplicationAction(job.id, application.id, 'approved')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleApplicationAction(job.id, application.id, 'rejected')}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                          
                          {application.status === 'approved' && (
                            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4" />
                              <span>Approved</span>
                            </span>
                          )}
                          
                          {application.status === 'rejected' && (
                            <span className="px-4 py-2 bg-red-100 text-red-800 rounded-lg flex items-center space-x-2">
                              <XCircle className="w-4 h-4" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              
              {job.applications.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
                  <p className="text-gray-600">Your job is live and workers can start applying</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {filteredJobs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-600">Try adjusting your search terms or filters</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Company Dashboard</h1>
              <p className="text-gray-600">Manage your job postings and applications on the blockchain</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-700">₹{companyBalance.toLocaleString()}</span>
                <span className="text-xs text-gray-500">Available</span>
              </div>
              <button
                onClick={() => setShowDepositModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Add Funds</span>
              </button>
              <button
                onClick={() => setShowPostJobModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-semibold"
              >
                <Plus className="w-5 h-5" />
                <span>Post New Job</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'jobs', label: 'My Jobs', icon: Briefcase },
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'jobs' && renderJobsTab()}
      </div>

      {/* Post Job Modal */}
      <AnimatePresence>
        {showPostJobModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowPostJobModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Post New Job</h2>
                    <p className="text-gray-600">Create and publish your job listing with escrow protection</p>
                  </div>
                  <button
                    onClick={() => setShowPostJobModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Balance Warning */}
                {jobFormErrors.balance && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-red-800 font-medium">Insufficient Balance</p>
                      <p className="text-red-600 text-sm">{jobFormErrors.balance}</p>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Job Title */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Job Title *
                    </label>
                    <input
                      value={jobForm.title}
                      onChange={(e) => handleJobFormChange('title', e.target.value)}
                      placeholder="e.g., Construction Site Helper"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        jobFormErrors.title ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {jobFormErrors.title && (
                      <p className="text-red-500 text-sm mt-1">{jobFormErrors.title}</p>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Job Category *
                    </label>
                    <select
                      value={jobForm.category}
                      onChange={(e) => handleJobFormChange('category', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {jobCategories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Experience Level */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Experience Level *
                    </label>
                    <select
                      value={jobForm.experienceLevel}
                      onChange={(e) => handleJobFormChange('experienceLevel', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {experienceLevels.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Daily Wage */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Daily Wage (₹) *
                    </label>
                    <input
                      type="number"
                      value={jobForm.dailyWage}
                      onChange={(e) => handleJobFormChange('dailyWage', parseInt(e.target.value) || 0)}
                      min="100"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        jobFormErrors.dailyWage ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {jobFormErrors.dailyWage && (
                      <p className="text-red-500 text-sm mt-1">{jobFormErrors.dailyWage}</p>
                    )}
                  </div>

                  {/* Total Positions */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Total Positions *
                    </label>
                    <input
                      type="number"
                      value={jobForm.totalPositions}
                      onChange={(e) => handleJobFormChange('totalPositions', parseInt(e.target.value) || 1)}
                      min="1"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        jobFormErrors.totalPositions ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {jobFormErrors.totalPositions && (
                      <p className="text-red-500 text-sm mt-1">{jobFormErrors.totalPositions}</p>
                    )}
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={jobForm.startTime}
                      onChange={(e) => handleJobFormChange('startTime', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={jobForm.endTime}
                      onChange={(e) => handleJobFormChange('endTime', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={jobForm.startDate}
                      onChange={(e) => handleJobFormChange('startDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        jobFormErrors.startDate ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {jobFormErrors.startDate && (
                      <p className="text-red-500 text-sm mt-1">{jobFormErrors.startDate}</p>
                    )}
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={jobForm.endDate}
                      onChange={(e) => handleJobFormChange('endDate', e.target.value)}
                      min={jobForm.startDate || new Date().toISOString().split('T')[0]}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        jobFormErrors.endDate ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {jobFormErrors.endDate && (
                      <p className="text-red-500 text-sm mt-1">{jobFormErrors.endDate}</p>
                    )}
                  </div>
                </div>

                {/* Location Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Address *
                      </label>
                      <input
                        value={jobForm.location.address}
                        onChange={(e) => handleJobFormChange('location.address', e.target.value)}
                        placeholder="Enter full address"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          jobFormErrors['location.address'] ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {jobFormErrors['location.address'] && (
                        <p className="text-red-500 text-sm mt-1">{jobFormErrors['location.address']}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        value={jobForm.location.city}
                        onChange={(e) => handleJobFormChange('location.city', e.target.value)}
                        placeholder="Enter city"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          jobFormErrors['location.city'] ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {jobFormErrors['location.city'] && (
                        <p className="text-red-500 text-sm mt-1">{jobFormErrors['location.city']}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        value={jobForm.location.state}
                        onChange={(e) => handleJobFormChange('location.state', e.target.value)}
                        placeholder="Enter state"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          jobFormErrors['location.state'] ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {jobFormErrors['location.state'] && (
                        <p className="text-red-500 text-sm mt-1">{jobFormErrors['location.state']}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Job Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Description *
                  </label>
                  <textarea
                    value={jobForm.description}
                    onChange={(e) => handleJobFormChange('description', e.target.value)}
                    placeholder="Describe the job responsibilities, requirements, and working conditions..."
                    rows={4}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      jobFormErrors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {jobFormErrors.description && (
                    <p className="text-red-500 text-sm mt-1">{jobFormErrors.description}</p>
                  )}
                </div>

                {/* Required Skills */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Required Skills
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {jobForm.requiredSkills.map((skill, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkillFromJob(skill)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSkills.filter(skill => !jobForm.requiredSkills.includes(skill)).map((skill, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => addSkillToJob(skill)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
                      >
                        + {skill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Additional Requirements
                    </label>
                    <button
                      type="button"
                      onClick={addRequirement}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      + Add Requirement
                    </button>
                  </div>
                  <div className="space-y-3">
                    {jobForm.requirements.map((requirement, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          value={requirement}
                          onChange={(e) => updateRequirement(index, e.target.value)}
                          placeholder="Enter a requirement..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => removeRequirement(index)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Urgent Job Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Mark as Urgent</h4>
                    <p className="text-sm text-gray-600">Urgent jobs get higher visibility to workers</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={jobForm.isUrgent}
                      onChange={(e) => handleJobFormChange('isUrgent', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Cost Calculation */}
                {jobForm.startDate && jobForm.endDate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Cost Breakdown</h4>
                    {(() => {
                      const days = Math.ceil((new Date(jobForm.endDate) - new Date(jobForm.startDate)) / (1000 * 60 * 60 * 24)) + 1;
                      const totalCost = jobForm.dailyWage * days * jobForm.totalPositions;
                      return (
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Daily wage per worker:</span>
                            <span>₹{jobForm.dailyWage}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Number of workers:</span>
                            <span>{jobForm.totalPositions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Duration:</span>
                            <span>{days} days</span>
                          </div>
                          <div className="border-t border-blue-200 pt-1 mt-2">
                            <div className="flex justify-between font-semibold">
                              <span>Total escrow amount:</span>
                              <span>₹{totalCost.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Funds will be held in escrow until job completion
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowPostJobModal(false)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePostJob}
                      disabled={isPostingJob}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      {isPostingJob ? (
                        <>
                          <ClipLoader size={16} color="white" />
                          <span>Posting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Post Job</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDepositModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Add Funds</h2>
                  <button
                    onClick={() => setShowDepositModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-gray-600">Current Balance: <span className="font-semibold text-green-600">₹{companyBalance.toLocaleString()}</span></p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Amount to Deposit (₹)
                  </label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex space-x-2">
                  {[1000, 5000, 10000].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setDepositAmount(amount.toString())}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      ₹{amount}
                    </button>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Secure Blockchain Transaction</p>
                      <p className="text-xs text-blue-700">Funds are stored securely in your wallet</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDepositModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeposit}
                    disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isDepositing}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isDepositing ? (
                      <>
                        <ClipLoader size={16} color="white" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Deposit ₹{depositAmount || '0'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Worker Info Modal */}
      <AnimatePresence>
        {showWorkerInfoModal && selectedWorker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowWorkerInfoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Worker Details</h2>
                  <button
                    onClick={() => setShowWorkerInfoModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Profile Header */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {selectedWorker.workerName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{selectedWorker.workerName}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-1" />
                        <span className="font-medium">{selectedWorker.rating}</span>
                        <span className="text-gray-500 text-sm ml-1">({selectedWorker.completedJobs} jobs completed)</span>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full capitalize">
                        {selectedWorker.experienceLevel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {selectedWorker.bio && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                    <p className="text-gray-600">{selectedWorker.bio}</p>
                  </div>
                )}

                {/* Contact Information */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{selectedWorker.phone}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{selectedWorker.email}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{selectedWorker.location} ({selectedWorker.distance}km away)</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 font-mono text-xs break-all">{selectedWorker.walletAddress}</span>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorker.skills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Work Statistics */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Work Statistics</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{selectedWorker.totalJobs}</div>
                      <div className="text-sm text-gray-600">Total Jobs</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{selectedWorker.completedJobs}</div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round((selectedWorker.completedJobs / selectedWorker.totalJobs) * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Success Rate</div>
                    </div>
                  </div>
                </div>

                {/* Previous Projects */}
                {selectedWorker.previousProjects && selectedWorker.previousProjects.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Previous Projects</h4>
                    <div className="space-y-2">
                      {selectedWorker.previousProjects.map((project, index) => (
                        <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{project}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {selectedWorker.certifications && selectedWorker.certifications.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Certifications</h4>
                    <div className="space-y-2">
                      {selectedWorker.certifications.map((cert, index) => (
                        <div key={index} className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg">
                          <Award className="w-4 h-4 text-green-500" />
                          <span className="text-gray-700">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Application Details */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Application Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Applied on:</span>
                      <span>{new Date(selectedWorker.appliedDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`capitalize font-medium ${
                        selectedWorker.status === 'approved' ? 'text-green-600' :
                        selectedWorker.status === 'rejected' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {selectedWorker.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompanyJobPostingPage;
