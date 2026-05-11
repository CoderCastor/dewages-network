use anchor_lang::prelude::*;

declare_id!("4f9fP5Aoz7Tcu7Z5J7WWhTRUa757QnK91JvpM1Zyg7BM");

const ADMIN_PUBKEY: &str = "5h54tPqd4ZbjTLF74SKVTCKmzRrnhP9tFqPcrHjxcfhQ";

#[program]
pub mod employment_platform {
    use super::*;

    pub fn initialize_platform(_ctx: Context<InitializePlatform>) -> Result<()> {
        Ok(())
    }

    pub fn create_user_profile(
        ctx: Context<CreateUserProfile>,
        user_type: UserType,
        name: String,
        phone: String,
        location: String,
    ) -> Result<()> {
        let admin_key = ADMIN_PUBKEY.parse::<Pubkey>().unwrap();
        require!(
            ctx.accounts.admin.key() == admin_key,
            ErrorCode::UnauthorizedAdmin
        );

        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.authority = ctx.accounts.target_user.key();
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

    /// STEP 1: Employer posts job AND locks payment in escrow immediately
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
        let escrow = &mut ctx.accounts.escrow;

        // Save job details
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

        // IMMEDIATELY transfer payment to escrow using CPI
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.employer.to_account_info(),
                to: escrow.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, payment_amount)?;

        // Initialize escrow
        escrow.job = job.key();
        escrow.employer = ctx.accounts.employer.key();
        escrow.worker = Pubkey::default();
        escrow.amount = payment_amount;
        escrow.is_locked = true;
        escrow.created_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    /// STEP 2: Employer approves/assigns a worker to the job
    pub fn assign_worker(ctx: Context<AssignWorker>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let escrow = &mut ctx.accounts.escrow;

        require!(job.status == JobStatus::Open, ErrorCode::JobNotOpen);
        require!(
            job.employer == ctx.accounts.employer.key(),
            ErrorCode::UnauthorizedEmployer
        );

        job.worker = Some(ctx.accounts.worker.key());
        job.status = JobStatus::InProgress;
        job.started_at = Some(Clock::get()?.unix_timestamp);
        escrow.worker = ctx.accounts.worker.key();

        Ok(())
    }

    /// STEP 3: Worker submits proof of work
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

    /// STEP 4: Auto-release payment after dispute period (if no dispute)
    pub fn release_payment(ctx: Context<ReleasePayment>) -> Result<()> {
        require!(
            ctx.accounts.job.status == JobStatus::PendingVerification,
            ErrorCode::InvalidJobStatus
        );

        let current_time = Clock::get()?.unix_timestamp;
        require!(
            ctx.accounts.job.dispute_deadline.unwrap() < current_time,
            ErrorCode::DisputePeriodActive
        );

        let escrow_amount = ctx.accounts.escrow.amount;

        // ✅ FIX: Use try_borrow_mut_lamports for AccountInfo types
        **ctx
            .accounts
            .escrow
            .to_account_info()
            .try_borrow_mut_lamports()? -= escrow_amount;
        **ctx.accounts.worker.try_borrow_mut_lamports()? += escrow_amount;

        let job = &mut ctx.accounts.job;
        let escrow = &mut ctx.accounts.escrow;

        job.status = JobStatus::Completed;
        escrow.is_locked = false;
        escrow.amount = 0;

        ctx.accounts.employer_profile.total_jobs += 1;
        ctx.accounts.worker_profile.total_jobs += 1;
        ctx.accounts.worker_profile.total_earnings += escrow_amount;

        msg!(
            "💰 Payment released: {} lamports to {}",
            escrow_amount,
            ctx.accounts.worker.key()
        );

        Ok(())
    }

    /// STEP 5: Employer creates dispute (within 3 days of proof submission)
    pub fn create_dispute(
        ctx: Context<CreateDispute>,
        reason: String,
        evidence: String,
    ) -> Result<()> {
        let job = &mut ctx.accounts.job;
        let dispute = &mut ctx.accounts.dispute;

        require!(
            job.status == JobStatus::PendingVerification,
            ErrorCode::InvalidJobStatus
        );
        require!(
            Clock::get()?.unix_timestamp <= job.dispute_deadline.unwrap(),
            ErrorCode::DisputePeriodExpired
        );

        job.status = JobStatus::Disputed;

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

    /// STEP 6: Admin resolves dispute
    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        resolution: DisputeResolution,
        resolution_notes: String,
    ) -> Result<()> {
        let admin_key = ADMIN_PUBKEY.parse::<Pubkey>().unwrap();
        require!(
            ctx.accounts.admin.key() == admin_key,
            ErrorCode::UnauthorizedAdmin
        );

        require!(
            ctx.accounts.job.status == JobStatus::Disputed,
            ErrorCode::JobNotDisputed
        );
        require!(
            ctx.accounts.dispute.status == DisputeStatus::Open,
            ErrorCode::DisputeAlreadyResolved
        );

        let escrow_amount = ctx.accounts.escrow.amount;

        // ✅ FIX: Use try_borrow_mut_lamports for all resolutions
        match resolution {
            DisputeResolution::FavorWorker => {
                **ctx
                    .accounts
                    .escrow
                    .to_account_info()
                    .try_borrow_mut_lamports()? -= escrow_amount;
                **ctx.accounts.worker.try_borrow_mut_lamports()? += escrow_amount;
                ctx.accounts.worker_profile.total_earnings += escrow_amount;
                ctx.accounts.worker_profile.total_jobs += 1;
                ctx.accounts.employer_profile.total_jobs += 1;
            }
            DisputeResolution::FavorEmployer => {
                **ctx
                    .accounts
                    .escrow
                    .to_account_info()
                    .try_borrow_mut_lamports()? -= escrow_amount;
                **ctx.accounts.employer.try_borrow_mut_lamports()? += escrow_amount;
            }
            DisputeResolution::Split => {
                let half = escrow_amount / 2;
                let remainder = escrow_amount - half;
                **ctx
                    .accounts
                    .escrow
                    .to_account_info()
                    .try_borrow_mut_lamports()? -= escrow_amount;
                **ctx.accounts.worker.try_borrow_mut_lamports()? += half;
                **ctx.accounts.employer.try_borrow_mut_lamports()? += remainder;
                ctx.accounts.worker_profile.total_earnings += half;
                ctx.accounts.worker_profile.total_jobs += 1;
                ctx.accounts.employer_profile.total_jobs += 1;
            }
        }

        let job = &mut ctx.accounts.job;
        let escrow = &mut ctx.accounts.escrow;
        let dispute = &mut ctx.accounts.dispute;

        dispute.status = match resolution {
            DisputeResolution::FavorWorker => DisputeStatus::ResolvedForWorker,
            DisputeResolution::FavorEmployer => DisputeStatus::ResolvedForEmployer,
            DisputeResolution::Split => DisputeStatus::ResolvedForWorker,
        };
        dispute.resolved_at = Some(Clock::get()?.unix_timestamp);
        dispute.resolution = Some(resolution_notes);

        job.status = JobStatus::Completed;
        escrow.is_locked = false;
        escrow.amount = 0;

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

        let total_jobs_before = target_profile.total_jobs;
        if total_jobs_before == 0 {
            target_profile.rating = rating as u64;
        } else {
            target_profile.rating =
                ((target_profile.rating * total_jobs_before) + rating as u64) / (total_jobs_before);
        }

        Ok(())
    }

    /// 🧪 TESTING ONLY: Skip dispute period by setting deadline to past
    pub fn skip_dispute_period_for_testing(
        ctx: Context<SkipDisputePeriodForTesting>,
    ) -> Result<()> {
        let admin_key = ADMIN_PUBKEY.parse::<Pubkey>().unwrap();
        require!(
            ctx.accounts.admin.key() == admin_key,
            ErrorCode::UnauthorizedAdmin
        );

        let job = &mut ctx.accounts.job;
        job.dispute_deadline = Some(Clock::get()?.unix_timestamp - 1);

        msg!("🧪 TESTING: Dispute deadline skipped for job {}", job.key());

        Ok(())
    }
}

// Account Schemas
#[account]
pub struct UserProfile {
    pub authority: Pubkey,
    pub user_type: UserType,
    pub name: String,
    pub phone: String,
    pub location: String,
    pub rating: u64,
    pub total_jobs: u64,
    pub total_earnings: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub verified_by_admin: bool,
    pub verified_at: Option<i64>,
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DisputeResolution {
    FavorWorker,
    FavorEmployer,
    Split,
}

// Context structs
#[derive(Accounts)]
pub struct InitializePlatform {}

#[derive(Accounts)]
#[instruction(user_type: UserType, name: String, phone: String, location: String)]
pub struct CreateUserProfile<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 346,
        seeds = [b"user_profile", target_user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,

    /// CHECK: Target user for profile creation
    pub target_user: AccountInfo<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

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

    #[account(
        init,
        payer = employer,
        space = 8 + 121,
        seeds = [b"escrow", job.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,

    #[account(mut)]
    pub employer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AssignWorker<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,

    #[account(
        mut,
        seeds = [b"escrow", job.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,

    /// CHECK: Worker being assigned
    pub worker: AccountInfo<'info>,

    #[account(mut)]
    pub employer: Signer<'info>,
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

    #[account(
        mut,
        seeds = [b"escrow", job.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,

    /// CHECK: Worker receiving payment
    #[account(mut)]
    pub worker: AccountInfo<'info>,

    #[account(mut)]
    pub employer_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub worker_profile: Account<'info, UserProfile>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateDispute<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,

    #[account(
        init,
        payer = employer,
        space = 8 + 850,
    )]
    pub dispute: Account<'info, Dispute>,

    #[account(mut)]
    pub employer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,

    #[account(
        mut,
        seeds = [b"escrow", job.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,

    #[account(mut)]
    pub dispute: Account<'info, Dispute>,

    /// CHECK: Worker account
    #[account(mut)]
    pub worker: AccountInfo<'info>,

    /// CHECK: Employer account
    #[account(mut)]
    pub employer: AccountInfo<'info>,

    #[account(mut)]
    pub employer_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub worker_profile: Account<'info, UserProfile>,

    pub admin: Signer<'info>,

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

#[derive(Accounts)]
pub struct SkipDisputePeriodForTesting<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,

    pub admin: Signer<'info>,
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
    #[msg("Only employer can assign workers")]
    UnauthorizedEmployer,
    #[msg("Job is not in disputed state")]
    JobNotDisputed,
    #[msg("Dispute already resolved")]
    DisputeAlreadyResolved,
}
