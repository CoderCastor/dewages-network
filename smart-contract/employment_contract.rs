use anchor_lang::prelude::*;

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("7HDt4y5twRafCBrNBhvPBqLTjT8kb6wHwLrxXYRsFFSz");

// ADMIN PUBLIC KEY - Replace with your actual admin wallet address
const ADMIN_PUBKEY: &str = "5h54tPqd4ZbjTLF74SKVTCKmzRrnhP9tFqPcrHjxcfhQ";

#[program]
pub mod employment_platform {
    use super::*;

    pub fn initialize_platform(_ctx: Context<InitializePlatform>) -> Result<()> {
        Ok(())
    }

    /// Create user profile - Can only be called by admin
    /// Admin signs the transaction and creates PDA for the target user
    pub fn create_user_profile(
        ctx: Context<CreateUserProfile>,
        user_type: UserType,
        name: String,
        phone: String,
        location: String,
    ) -> Result<()> {
        // Verify that the signer is the admin
        let admin_key = ADMIN_PUBKEY.parse::<Pubkey>().unwrap();
        require!(
            ctx.accounts.admin.key() == admin_key,
            ErrorCode::UnauthorizedAdmin
        );

        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.authority = ctx.accounts.target_user.key(); // Set the target user as authority
        user_profile.user_type = user_type;
        user_profile.name = name;
        user_profile.phone = phone;
        user_profile.location = location;
        user_profile.rating = 0;
        user_profile.total_jobs = 0;
        user_profile.total_earnings = 0;
        user_profile.is_active = true;
        user_profile.created_at = Clock::get()?.unix_timestamp;
        user_profile.verified_by_admin = true;
        user_profile.verified_at = Some(Clock::get()?.unix_timestamp);
        Ok(())
    }

    pub fn post_job(
        ctx: Context<PostJob>,
        title: String,
        description: String,
        category: JobCategory,
        payment_amount: u64,
        location: String,
        duration_hours: u16,
        requirements: String,
    ) -> Result<()> {
        let job = &mut ctx.accounts.job;
        job.employer = ctx.accounts.employer.key();
        job.title = title;
        job.description = description;
        job.category = category;
        job.payment_amount = payment_amount;
        job.location = location;
        job.duration_hours = duration_hours;
        job.requirements = requirements;
        job.status = JobStatus::Open;
        job.created_at = Clock::get()?.unix_timestamp;
        job.worker = None;
        job.started_at = None;
        job.completed_at = None;
        job.dispute_deadline = None;
        Ok(())
    }

    pub fn accept_job(ctx: Context<AcceptJob>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        require!(job.status == JobStatus::Open, ErrorCode::JobNotOpen);

        job.worker = Some(ctx.accounts.worker.key());
        job.status = JobStatus::InProgress;
        job.started_at = Some(Clock::get()?.unix_timestamp);
        Ok(())
    }

    pub fn lock_payment(ctx: Context<LockPayment>) -> Result<()> {
        let job = &ctx.accounts.job;
        let escrow = &mut ctx.accounts.escrow;

        // Transfer SOL from employer to escrow account
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.employer.key(),
            &escrow.key(),
            job.payment_amount,
        );

        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.employer.to_account_info(),
                escrow.to_account_info(),
            ],
        )?;

        escrow.job = job.key();
        escrow.employer = ctx.accounts.employer.key();
        escrow.worker = job.worker.unwrap();
        escrow.amount = job.payment_amount;
        escrow.is_locked = true;
        escrow.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn submit_proof_of_work(
        ctx: Context<SubmitProofOfWork>,
        proof_type: ProofType,
        proof_data: String,
        gps_coordinates: Option<String>,
    ) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let proof_of_work = &mut ctx.accounts.proof_of_work;

        require!(
            job.status == JobStatus::InProgress,
            ErrorCode::JobNotInProgress
        );
        require!(
            job.worker == Some(ctx.accounts.worker.key()),
            ErrorCode::UnauthorizedWorker
        );

        job.status = JobStatus::PendingVerification;
        job.completed_at = Some(Clock::get()?.unix_timestamp);
        job.dispute_deadline = Some(Clock::get()?.unix_timestamp + 3 * 24 * 60 * 60);

        proof_of_work.job = job.key();
        proof_of_work.worker = ctx.accounts.worker.key();
        proof_of_work.proof_type = proof_type;
        proof_of_work.proof_data = proof_data;
        proof_of_work.gps_coordinates = gps_coordinates;
        proof_of_work.submitted_at = Clock::get()?.unix_timestamp;
        proof_of_work.is_verified = false;
        Ok(())
    }

    pub fn release_payment(ctx: Context<ReleasePayment>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let escrow = &mut ctx.accounts.escrow;

        require!(
            job.status == JobStatus::PendingVerification,
            ErrorCode::InvalidJobStatus
        );

        let current_time = Clock::get()?.unix_timestamp;
        require!(
            job.dispute_deadline.unwrap() < current_time,
            ErrorCode::DisputePeriodActive
        );

        **escrow.to_account_info().try_borrow_mut_lamports()? -= escrow.amount;
        **ctx
            .accounts
            .worker
            .to_account_info()
            .try_borrow_mut_lamports()? += escrow.amount;

        job.status = JobStatus::Completed;
        escrow.is_locked = false;

        let employer_profile = &mut ctx.accounts.employer_profile;
        let worker_profile = &mut ctx.accounts.worker_profile;

        employer_profile.total_jobs += 1;
        worker_profile.total_jobs += 1;
        worker_profile.total_earnings += escrow.amount;

        Ok(())
    }

    pub fn create_dispute(
        ctx: Context<CreateDispute>,
        reason: String,
        evidence: String,
    ) -> Result<()> {
        let job = &ctx.accounts.job;
        let dispute = &mut ctx.accounts.dispute;

        require!(
            job.status == JobStatus::PendingVerification,
            ErrorCode::InvalidJobStatus
        );
        require!(
            Clock::get()?.unix_timestamp <= job.dispute_deadline.unwrap(),
            ErrorCode::DisputePeriodExpired
        );

        dispute.job = job.key();
        dispute.employer = ctx.accounts.employer.key();
        dispute.worker = job.worker.unwrap();
        dispute.reason = reason;
        dispute.evidence = evidence;
        dispute.status = DisputeStatus::Open;
        dispute.created_at = Clock::get()?.unix_timestamp;
        dispute.resolved_at = None;
        dispute.resolution = None;
        Ok(())
    }

    pub fn rate_user(ctx: Context<RateUser>, rating: u8, review: String) -> Result<()> {
        require!(rating >= 1 && rating <= 5, ErrorCode::InvalidRating);

        let user_rating = &mut ctx.accounts.user_rating;
        let target_profile = &mut ctx.accounts.target_profile;

        user_rating.rater = ctx.accounts.rater.key();
        user_rating.target = ctx.accounts.target_user.key();
        user_rating.job = ctx.accounts.job.key();
        user_rating.rating = rating;
        user_rating.review = review;
        user_rating.created_at = Clock::get()?.unix_timestamp;

        target_profile.rating = ((target_profile.rating * target_profile.total_jobs)
            + rating as u64)
            / (target_profile.total_jobs + 1);

        Ok(())
    }
}

// Account Schemas
#[account]
pub struct UserProfile {
    pub authority: Pubkey,              // The user's wallet address
    pub user_type: UserType,
    pub name: String,
    pub phone: String,
    pub location: String,
    pub rating: u64,
    pub total_jobs: u64,
    pub total_earnings: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub verified_by_admin: bool,        // NEW: Admin verification flag
    pub verified_at: Option<i64>,       // NEW: Timestamp of admin verification
}

#[account]
pub struct Job {
    pub employer: Pubkey,
    pub worker: Option<Pubkey>,
    pub title: String,
    pub description: String,
    pub category: JobCategory,
    pub payment_amount: u64,
    pub location: String,
    pub duration_hours: u16,
    pub requirements: String,
    pub status: JobStatus,
    pub created_at: i64,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub dispute_deadline: Option<i64>,
}

#[account]
pub struct EscrowAccount {
    pub job: Pubkey,
    pub employer: Pubkey,
    pub worker: Pubkey,
    pub amount: u64,
    pub is_locked: bool,
    pub created_at: i64,
}

#[account]
pub struct ProofOfWork {
    pub job: Pubkey,
    pub worker: Pubkey,
    pub proof_type: ProofType,
    pub proof_data: String,
    pub gps_coordinates: Option<String>,
    pub submitted_at: i64,
    pub is_verified: bool,
}

#[account]
pub struct Dispute {
    pub job: Pubkey,
    pub employer: Pubkey,
    pub worker: Pubkey,
    pub reason: String,
    pub evidence: String,
    pub status: DisputeStatus,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub resolution: Option<String>,
}

#[account]
pub struct UserRating {
    pub rater: Pubkey,
    pub target: Pubkey,
    pub job: Pubkey,
    pub rating: u8,
    pub review: String,
    pub created_at: i64,
}

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum UserType {
    Worker,
    Employer,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum JobCategory {
    Construction,
    Delivery,
    DomesticHelp,
    EventStaffing,
    Agriculture,
    Cleaning,
    Security,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum JobStatus {
    Open,
    InProgress,
    PendingVerification,
    Completed,
    Disputed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ProofType {
    Photo,
    QRCode,
    OTP,
    GPS,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DisputeStatus {
    Open,
    UnderReview,
    ResolvedForEmployer,
    ResolvedForWorker,
    Dismissed,
}

// Context structs for instructions
#[derive(Accounts)]
pub struct InitializePlatform {}

/// Updated CreateUserProfile context - Admin signs, creates PDA for target user
#[derive(Accounts)]
#[instruction(user_type: UserType, name: String, phone: String, location: String)]
pub struct CreateUserProfile<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 1 + 100 + 50 + 100 + 8 + 8 + 8 + 1 + 8 + 1 + 9, // Updated space calculation
        seeds = [b"user_profile", target_user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    /// CHECK: This is the target user for whom the profile is being created
    pub target_user: AccountInfo<'info>,
    
    #[account(mut)]
    pub admin: Signer<'info>,  // Admin pays for the account creation
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PostJob<'info> {
    #[account(
        init,
        payer = employer,
        space = 8 + 1200,
    )]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub employer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptJob<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,
    pub worker: Signer<'info>,
}

#[derive(Accounts)]
pub struct LockPayment<'info> {
    #[account(
        init,
        payer = employer,
        space = 8 + 120,
        seeds = [b"escrow", job.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub employer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitProofOfWork<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(
        init,
        payer = worker,
        space = 8 + 350,
    )]
    pub proof_of_work: Account<'info, ProofOfWork>,
    #[account(mut)]
    pub worker: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleasePayment<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    /// CHECK: Worker account to receive payment
    #[account(mut)]
    pub worker: AccountInfo<'info>,
    #[account(mut)]
    pub employer_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub worker_profile: Account<'info, UserProfile>,
}

#[derive(Accounts)]
pub struct CreateDispute<'info> {
    pub job: Account<'info, Job>,
    #[account(
        init,
        payer = employer,
        space = 8 + 800,
    )]
    pub dispute: Account<'info, Dispute>,
    #[account(mut)]
    pub employer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RateUser<'info> {
    #[account(
        init,
        payer = rater,
        space = 8 + 320,
    )]
    pub user_rating: Account<'info, UserRating>,
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub target_profile: Account<'info, UserProfile>,
    /// CHECK: Target user being rated
    pub target_user: AccountInfo<'info>,
    #[account(mut)]
    pub rater: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Job is not open for applications")]
    JobNotOpen,
    #[msg("Job is not in progress")]
    JobNotInProgress,
    #[msg("Unauthorized worker")]
    UnauthorizedWorker,
    #[msg("Invalid job status")]
    InvalidJobStatus,
    #[msg("Dispute period is still active")]
    DisputePeriodActive,
    #[msg("Dispute period has expired")]
    DisputePeriodExpired,
    #[msg("Rating must be between 1 and 5")]
    InvalidRating,
    #[msg("Only admin can create user profiles")]
    UnauthorizedAdmin,
}