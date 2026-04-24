const pool = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  console.log('Seeding database...');

  // Drop and recreate tables
  await pool.query(`
    DROP TABLE IF EXISTS multi_language_voices CASCADE;
    DROP TABLE IF EXISTS sentiment_analyses CASCADE;
    DROP TABLE IF EXISTS ai_suggestions CASCADE;
    DROP TABLE IF EXISTS content_history CASCADE;
    DROP TABLE IF EXISTS team_members CASCADE;
    DROP TABLE IF EXISTS audit_reports CASCADE;
    DROP TABLE IF EXISTS content_templates CASCADE;
    DROP TABLE IF EXISTS competitor_analyses CASCADE;
    DROP TABLE IF EXISTS vocabulary_terms CASCADE;
    DROP TABLE IF EXISTS content_scores CASCADE;
    DROP TABLE IF EXISTS channels CASCADE;
    DROP TABLE IF EXISTS style_guide_rules CASCADE;
    DROP TABLE IF EXISTS tone_detections CASCADE;
    DROP TABLE IF EXISTS content_analyses CASCADE;
    DROP TABLE IF EXISTS brand_profiles CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);

  // Create tables
  await pool.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'viewer',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE brand_profiles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      industry VARCHAR(100),
      tone_attributes TEXT,
      personality_traits TEXT,
      target_audience VARCHAR(255),
      brand_values TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE content_analyses (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      channel VARCHAR(100),
      ai_analysis TEXT,
      consistency_score INTEGER,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE tone_detections (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      expected_tone VARCHAR(100),
      detected_tone VARCHAR(100),
      ai_analysis TEXT,
      confidence INTEGER,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE style_guide_rules (
      id SERIAL PRIMARY KEY,
      rule_name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      description TEXT,
      examples TEXT,
      severity VARCHAR(50),
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE channels (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100),
      description TEXT,
      guidelines TEXT,
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE content_scores (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      scoring_criteria VARCHAR(255),
      overall_score INTEGER,
      ai_analysis TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE vocabulary_terms (
      id SERIAL PRIMARY KEY,
      term VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      status VARCHAR(50) DEFAULT 'approved',
      definition TEXT,
      usage_example TEXT,
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE competitor_analyses (
      id SERIAL PRIMARY KEY,
      competitor_name VARCHAR(255) NOT NULL,
      industry VARCHAR(100),
      sample_content TEXT,
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      ai_analysis TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE content_templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      channel VARCHAR(100),
      template_content TEXT,
      variables TEXT,
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE audit_reports (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      audit_scope TEXT,
      ai_analysis TEXT,
      overall_score INTEGER,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE team_members (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      role VARCHAR(100),
      department VARCHAR(100),
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE content_history (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      channel VARCHAR(100),
      author VARCHAR(255),
      version VARCHAR(50),
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      change_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE ai_suggestions (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      original_content TEXT,
      suggestion_type VARCHAR(100),
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      ai_suggestion TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE sentiment_analyses (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      ai_analysis TEXT,
      sentiment_score DECIMAL(4,2),
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE multi_language_voices (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      source_content TEXT,
      source_language VARCHAR(50),
      target_language VARCHAR(50),
      brand_profile_id INTEGER REFERENCES brand_profiles(id) ON DELETE SET NULL,
      ai_analysis TEXT,
      quality_score INTEGER,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed users
  const hashedPassword = await bcrypt.hash('password123', 10);
  await pool.query(`
    INSERT INTO users (name, email, password_hash, role) VALUES
    ('Admin User', 'admin@brandvoice.com', $1, 'admin'),
    ('Marketing Manager', 'manager@brandvoice.com', $1, 'manager'),
    ('Content Writer', 'writer@brandvoice.com', $1, 'editor')
  `, [hashedPassword]);

  // Seed Brand Profiles (15 items)
  await pool.query(`
    INSERT INTO brand_profiles (name, description, industry, tone_attributes, personality_traits, target_audience, brand_values) VALUES
    ('TechNova', 'Leading technology innovator focused on AI solutions', 'Technology', '["innovative","confident","approachable"]', '["bold","forward-thinking","trustworthy"]', 'Tech professionals 25-45', '["innovation","transparency","excellence"]'),
    ('GreenLeaf Organics', 'Premium organic food and wellness brand', 'Food & Beverage', '["warm","nurturing","authentic"]', '["caring","honest","natural"]', 'Health-conscious consumers 30-55', '["sustainability","health","community"]'),
    ('UrbanStyle Co', 'Modern urban fashion for young professionals', 'Fashion', '["trendy","confident","edgy"]', '["bold","creative","inclusive"]', 'Urban millennials 22-35', '["style","individuality","quality"]'),
    ('SafeGuard Financial', 'Trusted financial advisory services', 'Finance', '["professional","reassuring","authoritative"]', '["reliable","knowledgeable","ethical"]', 'Professionals 35-60', '["trust","security","growth"]'),
    ('PlayMakers Education', 'Interactive learning platform for children', 'Education', '["playful","encouraging","simple"]', '["fun","supportive","engaging"]', 'Parents with kids 5-12', '["learning","creativity","safety"]'),
    ('Velocity Motors', 'High-performance electric vehicles', 'Automotive', '["powerful","sleek","innovative"]', '["ambitious","progressive","premium"]', 'Affluent professionals 30-50', '["performance","sustainability","luxury"]'),
    ('CloudPeak Software', 'Enterprise cloud solutions provider', 'SaaS', '["technical","clear","reliable"]', '["expert","efficient","scalable"]', 'CTOs and IT managers', '["reliability","scalability","security"]'),
    ('Zen Wellness Spa', 'Luxury wellness and spa experiences', 'Hospitality', '["serene","luxurious","inviting"]', '["calming","attentive","refined"]', 'Affluent women 28-55', '["relaxation","luxury","wellbeing"]'),
    ('RapidFit Gym', 'High-intensity fitness brand', 'Fitness', '["energetic","motivational","direct"]', '["tough","supportive","results-driven"]', 'Fitness enthusiasts 20-40', '["strength","discipline","transformation"]'),
    ('PetPals', 'Premium pet care products and services', 'Pet Care', '["loving","cheerful","trustworthy"]', '["caring","playful","reliable"]', 'Pet owners 25-50', '["love","health","happiness"]'),
    ('Artisan Coffee Co', 'Specialty coffee roasters and cafes', 'Food & Beverage', '["warm","knowledgeable","artisanal"]', '["passionate","authentic","crafted"]', 'Coffee enthusiasts 25-45', '["quality","craft","community"]'),
    ('MediCare Plus', 'Digital healthcare platform', 'Healthcare', '["compassionate","professional","clear"]', '["empathetic","trustworthy","innovative"]', 'Patients and healthcare providers', '["care","accessibility","innovation"]'),
    ('EcoTravel Adventures', 'Sustainable travel experiences', 'Travel', '["adventurous","inspiring","responsible"]', '["passionate","conscious","authentic"]', 'Eco-conscious travelers 25-45', '["adventure","sustainability","culture"]'),
    ('ByteSize Learning', 'Micro-learning platform for professionals', 'EdTech', '["concise","smart","engaging"]', '["efficient","modern","accessible"]', 'Busy professionals 25-40', '["efficiency","growth","accessibility"]'),
    ('Luxe Home Designs', 'Premium interior design consultancy', 'Design', '["elegant","sophisticated","inspiring"]', '["creative","meticulous","visionary"]', 'Homeowners 35-60', '["beauty","quality","craftsmanship"]')
  `);

  // Seed Content Analyses (15 items)
  await pool.query(`
    INSERT INTO content_analyses (title, content, brand_profile_id, channel, ai_analysis, consistency_score, status) VALUES
    ('Homepage Hero Copy', 'Unleash the power of AI to transform your business operations with cutting-edge solutions that drive results.', 1, 'website', 'Strong alignment with innovative tone. Good use of action verbs. Confidence level matches brand personality.', 92, 'completed'),
    ('Instagram Post - Spring', 'Fresh from the earth, nourished by nature. Our new spring collection is here to energize your mornings.', 2, 'social_media', 'Warm and authentic tone well-maintained. Natural imagery aligns with brand values.', 88, 'completed'),
    ('Email Newsletter Q1', 'Step into the new season with bold choices. Our latest collection redefines urban sophistication.', 3, 'email', 'Trendy and confident tone achieved. Could strengthen edgy personality trait.', 78, 'completed'),
    ('Annual Report Intro', 'In these uncertain times, SafeGuard stands as your unwavering financial partner, committed to your prosperity.', 4, 'print', 'Professional and reassuring. Excellent alignment with brand values of trust and security.', 95, 'completed'),
    ('App Store Description', 'Learning is an adventure! Join thousands of kids exploring math, science, and reading through fun interactive games.', 5, 'app_store', 'Playful and encouraging. Simple language appropriate for parent audience.', 90, 'completed'),
    ('Product Launch Press Release', 'The all-new Velocity V8 redefines what an electric vehicle can be — 0 to 60 in 2.8 seconds, zero compromises.', 6, 'press', 'Powerful and sleek tone. Premium positioning well-communicated.', 93, 'completed'),
    ('Blog: Cloud Migration Guide', 'Migrating to the cloud doesnt have to be complex. Our step-by-step framework simplifies enterprise transitions.', 7, 'blog', 'Technical yet clear. Reliability messaging strong. Could add more expert authority.', 82, 'completed'),
    ('Spa Menu Description', 'Surrender to serenity. Our signature treatments blend ancient wisdom with modern luxury for complete renewal.', 8, 'print', 'Serene and luxurious. Beautiful word choices that match brand personality perfectly.', 96, 'completed'),
    ('Workout Program Ad', 'No excuses. No shortcuts. Just results. Join the 30-day transformation challenge that changes everything.', 9, 'social_media', 'Energetic and motivational. Direct tone matches brand perfectly. Strong call to action.', 91, 'completed'),
    ('Product Page - Dog Food', 'Because your best friend deserves the best. Premium nutrition crafted with love for healthier, happier pets.', 10, 'website', 'Loving and trustworthy. Cheerful tone maintained. Good brand value alignment.', 87, 'completed'),
    ('Coffee Origin Story', 'From the misty highlands of Ethiopia to your morning cup — every bean tells a story of craft and passion.', 11, 'website', 'Warm and knowledgeable. Artisanal feel strong. Authentic storytelling approach.', 94, 'completed'),
    ('Patient Onboarding Email', 'Your health journey starts here. Our team of specialists is ready to provide personalized care, right from your phone.', 12, 'email', 'Compassionate and professional. Clear messaging. Good accessibility emphasis.', 89, 'completed'),
    ('Trip Package - Costa Rica', 'Discover the untouched rainforests while supporting local communities. Adventure meets responsibility.', 13, 'website', 'Adventurous and responsible. Sustainability message integrated naturally.', 86, 'completed'),
    ('Course Promo - Leadership', '5 minutes a day. Practical leadership skills. Real career impact. Start your micro-learning journey today.', 14, 'social_media', 'Concise and smart. Efficiency messaging strong. Engaging format.', 88, 'completed'),
    ('Design Portfolio Intro', 'Where vision meets craftsmanship. Each space we create tells the unique story of those who call it home.', 15, 'website', 'Elegant and sophisticated. Inspiring without being pretentious. Excellent brand fit.', 93, 'completed')
  `);

  // Seed Tone Detections (15 items)
  await pool.query(`
    INSERT INTO tone_detections (title, content, expected_tone, detected_tone, ai_analysis, confidence, status) VALUES
    ('Product Launch Email', 'We are thrilled to announce our revolutionary new platform that will change the way you work forever.', 'excited', 'enthusiastic', 'Primary tone: enthusiastic/excited. High energy. Slightly hyperbolic language detected.', 92, 'completed'),
    ('Customer Apology', 'We sincerely apologize for the inconvenience. We take full responsibility and are working to resolve this immediately.', 'apologetic', 'sincere_apologetic', 'Genuine apologetic tone. Professional accountability language. Appropriate formality.', 95, 'completed'),
    ('Holiday Greeting', 'Wishing you and your loved ones a season filled with warmth, joy, and beautiful memories.', 'warm', 'warm_festive', 'Warm and inclusive tone. Positive sentiment. Appropriate emotional engagement.', 88, 'completed'),
    ('Security Alert', 'Important: We have detected unusual activity on your account. Please verify your identity immediately.', 'urgent', 'urgent_authoritative', 'Urgent tone achieved. Clear and direct. Appropriate authority without causing panic.', 94, 'completed'),
    ('Feature Update Blog', 'Heres whats new: weve added three features our users have been requesting, making your workflow even smoother.', 'informative', 'informative_friendly', 'Informative with friendly undertone. Conversational style. User-centric messaging.', 86, 'completed'),
    ('Investor Update', 'Q3 results demonstrate strong growth across all segments, with revenue increasing 34% year-over-year.', 'professional', 'formal_confident', 'Professional and data-driven. Confident without being arrogant. Appropriate for investors.', 91, 'completed'),
    ('Social Media Reply', 'Hey! Thanks so much for the kind words! We love hearing from happy customers like you!', 'casual', 'enthusiastic_casual', 'Casual and enthusiastic. Multiple exclamation points may be excessive. Genuine warmth.', 83, 'completed'),
    ('Privacy Policy Update', 'We have updated our privacy policy to better protect your data and comply with new regulations.', 'neutral', 'formal_neutral', 'Neutral and formal. Clear communication. Trustworthy tone maintained.', 90, 'completed'),
    ('Motivational Newsletter', 'Every setback is a setup for a comeback. This week, push past your limits and discover what youre truly capable of.', 'motivational', 'inspirational', 'Strong motivational tone. Empowering language. Good emotional engagement.', 93, 'completed'),
    ('Product Comparison', 'Our solution offers 3x faster processing, 99.9% uptime, and dedicated support — at half the industry price.', 'competitive', 'confident_assertive', 'Confident and assertive. Data-backed claims. Competitive positioning clear.', 87, 'completed'),
    ('Thank You Page', 'Thank you for your purchase! Your order is being prepared with care and will be on its way shortly.', 'grateful', 'warm_appreciative', 'Warm and appreciative. Professional gratitude. Sets appropriate expectations.', 89, 'completed'),
    ('Crisis Communication', 'We are aware of the current situation and our team is actively working on a resolution. Updates will follow hourly.', 'calm', 'measured_professional', 'Calm and measured. Professional crisis response. Appropriate transparency level.', 92, 'completed'),
    ('Brand Story', 'It started with a simple idea in a garage. Today, we empower millions of businesses worldwide.', 'inspirational', 'narrative_aspirational', 'Aspirational narrative tone. Classic origin story approach. Emotional resonance.', 85, 'completed'),
    ('Technical Documentation', 'To configure the API endpoint, set the base URL in your environment variables and initialize the client.', 'instructional', 'technical_clear', 'Clear technical instruction. Appropriate directness. No unnecessary complexity.', 94, 'completed'),
    ('Year-End Celebration', 'What a year its been! Together, weve achieved incredible milestones and grown as a community.', 'celebratory', 'celebratory_reflective', 'Celebratory with reflective undertone. Community-focused. Appropriately proud.', 88, 'completed')
  `);

  // Seed Style Guide Rules (15 items)
  await pool.query(`
    INSERT INTO style_guide_rules (rule_name, category, description, examples, severity, brand_profile_id) VALUES
    ('Active Voice Priority', 'Grammar', 'Always prefer active voice over passive voice in all communications.', '["Good: We launched the product","Bad: The product was launched by us"]', 'high', 1),
    ('Oxford Comma Required', 'Punctuation', 'Always use the Oxford comma in lists of three or more items.', '["Good: red, blue, and green","Bad: red, blue and green"]', 'medium', 1),
    ('No Jargon in Customer Content', 'Vocabulary', 'Avoid technical jargon in customer-facing content unless necessary with definitions.', '["Good: Easy-to-use interface","Bad: Intuitive UX paradigm"]', 'high', 2),
    ('Sentence Length Limit', 'Readability', 'Keep sentences under 25 words for better readability.', '["Good: Short, clear sentences work best.","Bad: Long sentences that go on and on..."]', 'medium', 3),
    ('Brand Name Capitalization', 'Formatting', 'Always capitalize brand name correctly: TechNova (not Technova, TECHNOVA, or technova).', '["Good: TechNova","Bad: Technova, TECHNOVA"]', 'critical', 1),
    ('Inclusive Language', 'Tone', 'Use gender-neutral and inclusive language in all communications.', '["Good: team members, everyone","Bad: guys, manpower"]', 'high', 3),
    ('Numbers Style', 'Formatting', 'Spell out numbers one through nine; use numerals for 10 and above.', '["Good: three features, 15 updates","Bad: 3 features, fifteen updates"]', 'low', 4),
    ('CTA Verb First', 'Structure', 'Begin calls-to-action with a strong verb.', '["Good: Discover your potential","Bad: Your potential is waiting"]', 'medium', 5),
    ('Emoji Usage', 'Tone', 'Use emojis sparingly in social media only. Never in formal communications.', '["Good: Social post with 1-2 emojis","Bad: Email with multiple emojis"]', 'medium', 6),
    ('Headline Capitalization', 'Formatting', 'Use title case for headlines and sentence case for subheadings.', '["Good: The Future of Technology","Bad: the future of technology"]', 'medium', 7),
    ('Abbreviation Rules', 'Vocabulary', 'Spell out abbreviations on first use, then use abbreviation in parentheses.', '["Good: Artificial Intelligence (AI)...then AI","Bad: AI from the start"]', 'low', 8),
    ('Paragraph Length', 'Readability', 'Keep paragraphs to 3-4 sentences maximum for digital content.', '["Good: Short, scannable paragraphs","Bad: Wall of text"]', 'medium', 9),
    ('Date Format', 'Formatting', 'Use Month DD, YYYY format (e.g., March 15, 2024). Never use MM/DD/YY.', '["Good: March 15, 2024","Bad: 03/15/24"]', 'low', 10),
    ('Contractions Policy', 'Tone', 'Use contractions in casual content (social, blog). Avoid in formal content (reports, legal).', '["Good blog: Were excited","Good report: We are pleased"]', 'medium', 11),
    ('Link Text Standards', 'Accessibility', 'Use descriptive link text. Never use click here or learn more alone.', '["Good: View our pricing plans","Bad: Click here"]', 'high', 12)
  `);

  // Seed Channels (15 items)
  await pool.query(`
    INSERT INTO channels (name, type, description, guidelines, brand_profile_id, status) VALUES
    ('Company Website', 'website', 'Main corporate website and landing pages', 'Professional tone, clear CTAs, SEO-optimized content', 1, 'active'),
    ('Instagram', 'social_media', 'Visual storytelling and brand lifestyle content', 'Casual and inspiring, use hashtags, visual-first approach', 2, 'active'),
    ('LinkedIn', 'social_media', 'Professional networking and thought leadership', 'Professional yet approachable, industry insights, thought leadership', 3, 'active'),
    ('Email Marketing', 'email', 'Newsletter and promotional campaigns', 'Personalized, value-driven, clear subject lines', 4, 'active'),
    ('Twitter/X', 'social_media', 'Real-time updates and engagement', 'Concise, timely, conversational, trending topics', 5, 'active'),
    ('Blog', 'content', 'Long-form educational and thought leadership content', 'In-depth, authoritative, SEO-optimized, educational', 6, 'active'),
    ('YouTube', 'video', 'Video content, tutorials, and brand stories', 'Engaging, visual, informative, consistent intro/outro', 7, 'active'),
    ('Press Releases', 'press', 'Official company announcements', 'Formal, factual, structured, newsworthy', 8, 'active'),
    ('Customer Support', 'support', 'Help desk and support documentation', 'Empathetic, clear, solution-oriented, patient', 9, 'active'),
    ('TikTok', 'social_media', 'Short-form video content for younger audience', 'Fun, trendy, authentic, music-driven', 10, 'active'),
    ('Podcast', 'audio', 'Audio content and interviews', 'Conversational, informative, personality-driven', 11, 'active'),
    ('Mobile App', 'app', 'In-app messaging and notifications', 'Concise, actionable, contextual, non-intrusive', 12, 'active'),
    ('Print Materials', 'print', 'Brochures, flyers, and physical materials', 'Polished, detailed, premium feel, brand-consistent', 13, 'active'),
    ('Webinar', 'event', 'Live and recorded educational sessions', 'Educational, interactive, professional, engaging', 14, 'active'),
    ('SMS/Text', 'messaging', 'Text message marketing and alerts', 'Ultra-concise, urgent when needed, opt-in respect', 15, 'active')
  `);

  // Seed Content Scores (15 items)
  await pool.query(`
    INSERT INTO content_scores (title, content, brand_profile_id, scoring_criteria, overall_score, ai_analysis, status) VALUES
    ('Q1 Newsletter Draft', 'Discover how our latest innovations are reshaping the industry landscape for businesses like yours.', 1, 'brand_voice_alignment', 88, 'Strong tone alignment. Vocabulary matches brand guide. Good readability score.', 'completed'),
    ('Product Description A', 'Our organic face cream combines the purest ingredients with cutting-edge skincare science.', 2, 'tone_consistency', 92, 'Excellent natural/organic messaging. Warm tone maintained throughout.', 'completed'),
    ('Social Media Campaign', 'Break the mold. Define your style. Own your look with our new streetwear collection.', 3, 'engagement_potential', 85, 'Strong engagement potential. Edgy tone well-executed. Good CTA structure.', 'completed'),
    ('Investment Guide', 'Understanding market volatility is key to long-term financial success and portfolio stability.', 4, 'professionalism', 94, 'Highly professional. Authoritative without being condescending. Clear language.', 'completed'),
    ('Kids App Tutorial', 'Ready for an adventure? Tap the magic star to begin your learning quest with Professor Owl!', 5, 'age_appropriateness', 96, 'Perfect age-appropriate language. Fun and engaging. Clear instructions.', 'completed'),
    ('Vehicle Spec Sheet', 'Engineered for the future. The V12 delivers 600hp of pure electric performance with zero emissions.', 6, 'technical_accuracy', 90, 'Accurate specs presented elegantly. Premium positioning maintained.', 'completed'),
    ('API Documentation', 'Initialize the SDK with your API key to begin making authenticated requests to our endpoints.', 7, 'clarity', 87, 'Clear and technical. Good structure. Could use more examples.', 'completed'),
    ('Spa Treatment Menu', 'Immerse yourself in our signature hot stone therapy, where ancient healing meets modern luxury.', 8, 'luxury_positioning', 95, 'Excellent luxury positioning. Sensory language effective. Brand-perfect.', 'completed'),
    ('Workout Description', 'This high-intensity circuit combines compound movements with explosive cardio for maximum calorie burn.', 9, 'motivational_impact', 89, 'High energy tone. Technical fitness terms appropriate for audience.', 'completed'),
    ('Pet Food Label', 'Real chicken. Real vegetables. Real nutrition your furry family member will love.', 10, 'trust_building', 91, 'Trust-building language effective. Simple, honest messaging.', 'completed'),
    ('Coffee Blend Story', 'This single-origin Yirgacheffe brings bright citrus notes with a silky chocolate finish.', 11, 'expertise_display', 93, 'Knowledgeable and passionate. Expert-level descriptors used naturally.', 'completed'),
    ('Telehealth Promo', 'See a doctor from anywhere, anytime. Quality healthcare that fits your schedule, not the other way around.', 12, 'accessibility', 86, 'Clear accessibility messaging. Empathetic tone. Good patient focus.', 'completed'),
    ('Eco Tour Package', 'Trek through ancient cloud forests while contributing to local conservation and community development.', 13, 'sustainability_message', 88, 'Strong sustainability integration. Adventure balanced with responsibility.', 'completed'),
    ('Course Landing Page', 'Master data analytics in 10 minutes a day. Bite-sized lessons designed for busy professionals.', 14, 'conversion_potential', 90, 'Concise value proposition. Good efficiency messaging. Strong conversion elements.', 'completed'),
    ('Design Consultation Ad', 'Transform your living space into a masterpiece. Book your complimentary design consultation today.', 15, 'premium_positioning', 92, 'Elegant and aspirational. Premium positioning clear without being exclusive.', 'completed')
  `);

  // Seed Vocabulary Terms (15 items)
  await pool.query(`
    INSERT INTO vocabulary_terms (term, category, status, definition, usage_example, brand_profile_id) VALUES
    ('Innovate', 'action_words', 'approved', 'To introduce new methods, ideas, or products', 'We continuously innovate to stay ahead of the curve.', 1),
    ('Leverage', 'business', 'banned', 'Overused corporate jargon - use "use" or "apply" instead', 'Bad: Leverage our platform. Good: Use our platform.', 1),
    ('Organic', 'descriptors', 'approved', 'Naturally grown without synthetic chemicals', 'Our organic ingredients are sourced from certified farms.', 2),
    ('Disrupt', 'action_words', 'restricted', 'Only use in specific innovation contexts, not casually', 'Acceptable only in product launch content about genuinely new tech.', 3),
    ('Synergy', 'business', 'banned', 'Meaningless buzzword - be specific about collaboration benefits', 'Bad: Create synergies. Good: Combine strengths to achieve more.', 4),
    ('Empower', 'action_words', 'approved', 'To give someone the authority or power to do something', 'We empower learners to reach their full potential.', 5),
    ('Revolutionary', 'descriptors', 'restricted', 'Reserve for truly groundbreaking products only', 'Use only for major product launches, not minor updates.', 6),
    ('Scalable', 'technical', 'approved', 'Able to grow and handle increased demand', 'Our scalable infrastructure grows with your business needs.', 7),
    ('Indulge', 'luxury', 'approved', 'To allow oneself pleasure', 'Indulge in our signature aromatherapy experience.', 8),
    ('Crush it', 'motivational', 'approved', 'To perform exceptionally well', 'Crush it in your next workout with our new HIIT program.', 9),
    ('Fur-baby', 'pet', 'banned', 'Too informal - use "pet" or "companion" instead', 'Bad: your fur-baby. Good: your beloved companion.', 10),
    ('Artisanal', 'quality', 'approved', 'Made in a traditional or non-mechanized way', 'Our artisanal roasting process brings out unique flavors.', 11),
    ('Cutting-edge', 'descriptors', 'approved', 'The most advanced stage of development', 'Our cutting-edge telehealth platform connects you instantly.', 12),
    ('Wanderlust', 'travel', 'approved', 'Strong desire to travel and explore', 'Feed your wanderlust with our sustainable adventure packages.', 13),
    ('Bandwidth', 'business', 'banned', 'Jargon for capacity - use "time" or "capacity" instead', 'Bad: Do you have bandwidth? Good: Do you have time for this?', 14)
  `);

  // Seed Competitor Analyses (15 items)
  await pool.query(`
    INSERT INTO competitor_analyses (competitor_name, industry, sample_content, brand_profile_id, ai_analysis, status) VALUES
    ('DataMind AI', 'Technology', 'DataMind: Where data meets intelligence. Our AI solutions automate complex decisions for enterprise.', 1, 'Formal and technical tone. Heavy on jargon. Less approachable than TechNova. Differentiator: TechNova is more human.', 'completed'),
    ('WholeEarth Foods', 'Food & Beverage', 'Pure goodness from farm to table. Simple ingredients, extraordinary taste.', 2, 'Similar warm tone. Strong simplicity messaging. Differentiator: GreenLeaf has stronger wellness positioning.', 'completed'),
    ('MetroWear', 'Fashion', 'City streets. Big dreams. Your style, amplified. MetroWear for the unstoppable.', 3, 'Edgy and urban. More aggressive tone. Differentiator: UrbanStyle is more inclusive and less confrontational.', 'completed'),
    ('TrustWealth Advisors', 'Finance', 'Your wealth, our expertise. Five decades of trusted financial guidance.', 4, 'Traditional and established. Heritage-focused. Differentiator: SafeGuard is more modern and accessible.', 'completed'),
    ('LearnBuddies', 'Education', 'Making learning magical for every child! Explore, play, and grow with LearnBuddies!', 5, 'Very similar playful tone. Heavy exclamation use. Differentiator: PlayMakers has stronger educational credibility.', 'completed'),
    ('ElectraDrive', 'Automotive', 'Silent power. Infinite range. The future drives electric with ElectraDrive.', 6, 'Sleek and aspirational. Minimalist copy. Differentiator: Velocity emphasizes performance over serenity.', 'completed'),
    ('NimbusTech', 'SaaS', 'Cloud computing reimagined. Faster, smarter, more secure than ever before.', 7, 'Technical and comparative. Relies on superlatives. Differentiator: CloudPeak focuses on reliability over speed.', 'completed'),
    ('Oasis Retreat', 'Hospitality', 'Find your paradise. Where every moment is a celebration of tranquility.', 8, 'Similar serene positioning. Less specific about treatments. Differentiator: Zen Wellness is more holistic.', 'completed'),
    ('IronCore Fitness', 'Fitness', 'Built different. Train harder. Live stronger. IronCore — for those who never quit.', 9, 'Aggressive motivational. Exclusionary language. Differentiator: RapidFit is more results-focused, less gatekeeping.', 'completed'),
    ('HappyTails', 'Pet Care', 'Happy pets, happy life! Premium products for your four-legged family members.', 10, 'Cheerful but generic. Differentiator: PetPals has stronger quality/health positioning.', 'completed'),
    ('BrewMasters', 'Food & Beverage', 'Craft. Quality. Passion. Every cup of BrewMasters tells a story of dedication.', 11, 'Similar artisanal positioning. More formal. Differentiator: Artisan Coffee is warmer and more community-focused.', 'completed'),
    ('HealthConnect', 'Healthcare', 'Healthcare at your fingertips. Connect with providers instantly, anywhere.', 12, 'Convenience-focused. Less empathetic. Differentiator: MediCare Plus leads with compassion over convenience.', 'completed'),
    ('WildPath Tours', 'Travel', 'Adventure without limits. Explore the worlds most incredible destinations.', 13, 'Adventure-heavy. No sustainability angle. Differentiator: EcoTravel integrates responsibility naturally.', 'completed'),
    ('SkillSprint', 'EdTech', 'Learn anything, anytime. Sprint to mastery with SkillSprint courses.', 14, 'Speed-focused. Less structured approach. Differentiator: ByteSize is more curated and professional.', 'completed'),
    ('EliteInteriors', 'Design', 'Luxury redefined. Award-winning designers creating extraordinary spaces.', 15, 'Prestige-focused. More exclusive tone. Differentiator: Luxe Home is warmer and more personal.', 'completed')
  `);

  // Seed Content Templates (15 items)
  await pool.query(`
    INSERT INTO content_templates (name, category, channel, template_content, variables, brand_profile_id) VALUES
    ('Product Launch Email', 'marketing', 'email', 'Subject: Introducing {{product_name}} — {{tagline}}\n\nDear {{customer_name}},\n\nWe''re excited to introduce {{product_name}}, designed to {{benefit}}.\n\nKey features:\n- {{feature_1}}\n- {{feature_2}}\n- {{feature_3}}\n\n{{cta_text}}\n\nBest,\nThe {{brand_name}} Team', '["product_name","tagline","customer_name","benefit","feature_1","feature_2","feature_3","cta_text","brand_name"]', 1),
    ('Social Media Announcement', 'marketing', 'social_media', '{{hook}} {{emoji}}\n\n{{main_message}}\n\n{{benefit_1}}\n{{benefit_2}}\n{{benefit_3}}\n\n{{cta}} {{link}}\n\n{{hashtags}}', '["hook","emoji","main_message","benefit_1","benefit_2","benefit_3","cta","link","hashtags"]', 2),
    ('Blog Post Structure', 'content', 'blog', '# {{title}}\n\n{{intro_paragraph}}\n\n## {{section_1_title}}\n{{section_1_content}}\n\n## {{section_2_title}}\n{{section_2_content}}\n\n## {{section_3_title}}\n{{section_3_content}}\n\n## Key Takeaways\n{{takeaways}}\n\n{{cta}}', '["title","intro_paragraph","section_1_title","section_1_content","section_2_title","section_2_content","section_3_title","section_3_content","takeaways","cta"]', 3),
    ('Press Release', 'pr', 'press', 'FOR IMMEDIATE RELEASE\n\n{{headline}}\n{{subheadline}}\n\n{{city}}, {{date}} — {{opening_paragraph}}\n\n{{body_paragraph_1}}\n\n{{quote_attribution}}: "{{quote_text}}"\n\n{{body_paragraph_2}}\n\nAbout {{company_name}}\n{{boilerplate}}\n\nContact:\n{{contact_info}}', '["headline","subheadline","city","date","opening_paragraph","body_paragraph_1","quote_attribution","quote_text","body_paragraph_2","company_name","boilerplate","contact_info"]', 4),
    ('Customer Testimonial', 'social_proof', 'website', '"{{testimonial_quote}}"\n\n— {{customer_name}}, {{customer_title}} at {{company}}\n\nResults: {{metric_1}} | {{metric_2}} | {{metric_3}}', '["testimonial_quote","customer_name","customer_title","company","metric_1","metric_2","metric_3"]', 5),
    ('Newsletter Template', 'marketing', 'email', 'Hi {{first_name}},\n\n{{intro}}\n\nThis Week''s Highlights:\n\n1. {{highlight_1}}\n2. {{highlight_2}}\n3. {{highlight_3}}\n\n{{featured_content}}\n\n{{cta_button}}\n\nUntil next time,\n{{sender_name}}', '["first_name","intro","highlight_1","highlight_2","highlight_3","featured_content","cta_button","sender_name"]', 6),
    ('FAQ Entry', 'support', 'website', 'Q: {{question}}\n\nA: {{answer}}\n\nRelated: {{related_links}}\n\nStill need help? {{support_cta}}', '["question","answer","related_links","support_cta"]', 7),
    ('Event Invitation', 'marketing', 'email', 'You''re Invited: {{event_name}}\n\nDate: {{date}}\nTime: {{time}}\nLocation: {{location}}\n\n{{description}}\n\nSpeakers: {{speakers}}\n\nAgenda:\n{{agenda}}\n\n{{rsvp_cta}}', '["event_name","date","time","location","description","speakers","agenda","rsvp_cta"]', 8),
    ('Case Study', 'content', 'website', 'Case Study: {{client_name}}\n\nChallenge: {{challenge}}\n\nSolution: {{solution}}\n\nResults:\n- {{result_1}}\n- {{result_2}}\n- {{result_3}}\n\n{{client_quote}}\n\n{{cta}}', '["client_name","challenge","solution","result_1","result_2","result_3","client_quote","cta"]', 9),
    ('Product Description', 'ecommerce', 'website', '{{product_name}}\n\n{{short_description}}\n\nFeatures:\n{{features}}\n\nSpecifications:\n{{specs}}\n\nPrice: {{price}}\n\n{{cta_button}}', '["product_name","short_description","features","specs","price","cta_button"]', 10),
    ('Video Script Outline', 'content', 'video', 'INTRO (0:00-0:30): {{hook}}\n\nSEGMENT 1 (0:30-2:00): {{segment_1}}\n\nSEGMENT 2 (2:00-4:00): {{segment_2}}\n\nSEGMENT 3 (4:00-5:30): {{segment_3}}\n\nOUTRO (5:30-6:00): {{cta}} + {{subscribe_reminder}}', '["hook","segment_1","segment_2","segment_3","cta","subscribe_reminder"]', 11),
    ('Job Posting', 'hr', 'website', '{{job_title}} at {{company}}\n\nAbout Us: {{about}}\n\nRole: {{role_description}}\n\nRequirements:\n{{requirements}}\n\nBenefits:\n{{benefits}}\n\nApply: {{application_link}}', '["job_title","company","about","role_description","requirements","benefits","application_link"]', 12),
    ('Onboarding Welcome', 'customer_success', 'email', 'Welcome to {{brand_name}}, {{customer_name}}!\n\nGetting Started:\n1. {{step_1}}\n2. {{step_2}}\n3. {{step_3}}\n\nResources: {{resources}}\n\nYour success manager: {{manager_name}}\n\n{{support_info}}', '["brand_name","customer_name","step_1","step_2","step_3","resources","manager_name","support_info"]', 13),
    ('Survey Request', 'feedback', 'email', 'Hi {{name}},\n\nWe value your opinion! {{context}}\n\nIt takes just {{duration}} to complete.\n\n{{survey_link}}\n\nAs thanks, {{incentive}}\n\nThank you,\n{{team_name}}', '["name","context","duration","survey_link","incentive","team_name"]', 14),
    ('Crisis Communication', 'pr', 'email', 'Important Update from {{brand_name}}\n\n{{situation_summary}}\n\nWhat happened: {{details}}\n\nWhat we''re doing: {{actions}}\n\nWhat you can do: {{customer_actions}}\n\nFor questions: {{contact}}\n\nSincerely,\n{{executive_name}}, {{title}}', '["brand_name","situation_summary","details","actions","customer_actions","contact","executive_name","title"]', 15)
  `);

  // Seed Audit Reports (15 items)
  await pool.query(`
    INSERT INTO audit_reports (title, brand_profile_id, audit_scope, ai_analysis, overall_score, status) VALUES
    ('Q1 2024 Brand Voice Audit', 1, 'All channels', 'Executive Summary: Strong overall consistency at 88%. Website and email channels show highest alignment. Social media needs improvement in tone consistency. Key issues: inconsistent use of technical jargon across channels, CTA language varies too much.', 88, 'completed'),
    ('Social Media Consistency Review', 2, 'Social media channels', 'Instagram and Facebook maintain excellent brand voice. Twitter shows 15% lower consistency due to informal responses. Recommended: social media response templates for common scenarios.', 82, 'completed'),
    ('Email Campaign Audit', 3, 'Email marketing', 'Subject lines show 92% brand alignment. Body copy averages 85%. Footer CTAs need standardization. Personalization tokens properly used in 89% of emails.', 87, 'completed'),
    ('Annual Brand Health Check', 4, 'Full brand audit', 'Strong trust signals maintained across all touchpoints. Financial terminology consistent. Customer communications show professional tone. Investment reports meet regulatory tone requirements.', 91, 'completed'),
    ('Content Marketing Review', 5, 'Blog and content', 'Educational content maintains playful yet informative balance. Reading levels appropriate for parent audience. Visual content descriptions need more brand-aligned language.', 84, 'completed'),
    ('Product Launch Voice Audit', 6, 'Product pages and launch materials', 'Premium positioning consistently maintained. Technical specifications presented elegantly. Competitor comparison pages could better emphasize brand differentiators.', 89, 'completed'),
    ('Developer Documentation Review', 7, 'Technical docs and API guides', 'Technical accuracy high at 96%. Brand voice in documentation is clear but could be warmer. Code examples well-structured. Onboarding guides need improvement.', 86, 'completed'),
    ('Customer Experience Audit', 8, 'Support and customer touchpoints', 'Luxury experience consistent from website to in-spa communications. Booking confirmation emails maintain serene tone. Support responses could better match brand warmth.', 90, 'completed'),
    ('Marketing Collateral Review', 9, 'Print and digital ads', 'High-energy brand voice maintained in ads. Gym signage consistent with brand. Partnership materials need brand voice alignment review.', 83, 'completed'),
    ('Multi-Channel Consistency', 10, 'All customer touchpoints', 'PetPals voice is consistent across website and social. Product packaging copy needs review for tone alignment. Customer support emails are too formal for brand personality.', 79, 'completed'),
    ('Website Content Audit', 11, 'Website pages and blog', 'Artisanal voice well-maintained on product pages. Blog posts show strong brand alignment. About page needs refreshing to match current brand evolution.', 88, 'completed'),
    ('Patient Communication Review', 12, 'Patient-facing content', 'Compassionate tone consistently maintained. Medical terminology appropriately simplified. Telehealth scripts align with brand values. Appointment reminders could be warmer.', 92, 'completed'),
    ('Sustainability Messaging Audit', 13, 'All channels', 'Sustainability messaging authentic and well-integrated. No greenwashing detected. Adventure language balanced well with responsibility messaging. ISO certification language needs standardization.', 87, 'completed'),
    ('Learning Content Voice Check', 14, 'Course content and marketing', 'Concise and smart tone maintained in 91% of content. Course descriptions effective. Email drip sequences maintain engagement. Quiz questions could better reflect brand personality.', 85, 'completed'),
    ('Premium Positioning Audit', 15, 'All brand touchpoints', 'Luxury positioning consistent across portfolio presentations. Client proposals maintain elegant tone. Social media occasionally too casual for premium brand. Photography style guide compliance at 94%.', 90, 'completed')
  `);

  // Seed Team Members (15 items)
  await pool.query(`
    INSERT INTO team_members (name, email, role, department, brand_profile_id, status) VALUES
    ('Sarah Chen', 'sarah.chen@company.com', 'Brand Director', 'Marketing', 1, 'active'),
    ('Marcus Johnson', 'marcus.j@company.com', 'Content Strategist', 'Content', 2, 'active'),
    ('Emily Rodriguez', 'emily.r@company.com', 'Copywriter', 'Content', 3, 'active'),
    ('David Kim', 'david.kim@company.com', 'Social Media Manager', 'Marketing', 4, 'active'),
    ('Lisa Wang', 'lisa.w@company.com', 'Marketing Manager', 'Marketing', 5, 'active'),
    ('James O''Brien', 'james.ob@company.com', 'Creative Director', 'Design', 6, 'active'),
    ('Priya Patel', 'priya.p@company.com', 'SEO Specialist', 'Digital', 7, 'active'),
    ('Alex Thompson', 'alex.t@company.com', 'PR Manager', 'Communications', 8, 'active'),
    ('Nina Volkov', 'nina.v@company.com', 'UX Writer', 'Product', 9, 'active'),
    ('Carlos Mendez', 'carlos.m@company.com', 'Email Marketing Lead', 'Marketing', 10, 'active'),
    ('Rachel Foster', 'rachel.f@company.com', 'Brand Analyst', 'Analytics', 11, 'active'),
    ('Tom Wilson', 'tom.w@company.com', 'Content Editor', 'Content', 12, 'active'),
    ('Aisha Hassan', 'aisha.h@company.com', 'Localization Manager', 'International', 13, 'active'),
    ('Ben Cooper', 'ben.c@company.com', 'Video Producer', 'Media', 14, 'active'),
    ('Sophie Martin', 'sophie.m@company.com', 'Brand Compliance Officer', 'Legal', 15, 'active')
  `);

  // Seed Content History (15 items)
  await pool.query(`
    INSERT INTO content_history (title, content, channel, author, version, brand_profile_id, change_type) VALUES
    ('Homepage Hero Banner', 'Innovate. Transform. Succeed. With TechNova AI Solutions.', 'website', 'Sarah Chen', '3.2', 1, 'updated'),
    ('Spring Campaign Post', 'Nature knows best. Our spring collection celebrates pure, organic goodness.', 'social_media', 'Marcus Johnson', '2.1', 2, 'updated'),
    ('Urban Style Manifesto', 'Style is not what you wear. Its how you wear it. UrbanStyle redefines the rules.', 'website', 'Emily Rodriguez', '1.0', 3, 'created'),
    ('Q4 Investment Newsletter', 'Navigating market uncertainty with confidence. Your quarterly financial insights from SafeGuard.', 'email', 'David Kim', '4.0', 4, 'updated'),
    ('App Update Announcement', 'New adventures await! Professor Owl has 50 new lessons ready for your young explorers!', 'app_store', 'Lisa Wang', '2.5', 5, 'updated'),
    ('V8 Launch Teaser', 'Something extraordinary is coming. 2.8 seconds that will redefine electric.', 'social_media', 'James OBrien', '1.0', 6, 'created'),
    ('Cloud Migration Whitepaper', 'The definitive guide to enterprise cloud migration: strategies, pitfalls, and best practices.', 'blog', 'Priya Patel', '1.3', 7, 'updated'),
    ('Holiday Spa Promotion', 'Give the gift of serenity. Holiday spa packages starting from $199.', 'email', 'Alex Thompson', '2.0', 8, 'updated'),
    ('New Year Challenge', '2024 is your year. 30 days. Total transformation. Are you ready?', 'social_media', 'Nina Volkov', '1.1', 9, 'updated'),
    ('Premium Dog Food Launch', 'Introducing TailWag Premium: Real meat, real nutrition, real tail wags.', 'website', 'Carlos Mendez', '1.0', 10, 'created'),
    ('Ethiopian Origin Blog', 'The journey of a single bean: From Ethiopian highlands to your perfect morning pour.', 'blog', 'Rachel Foster', '3.0', 11, 'updated'),
    ('Telehealth Launch Email', 'Healthcare reimagined: Quality medical care, now available from your living room.', 'email', 'Tom Wilson', '2.2', 12, 'updated'),
    ('Costa Rica Package Update', 'New for 2024: Carbon-neutral cloud forest expeditions with local indigenous guides.', 'website', 'Aisha Hassan', '1.5', 13, 'updated'),
    ('Data Analytics Course', 'From data novice to analytics pro: Your 12-week micro-learning journey starts here.', 'website', 'Ben Cooper', '1.0', 14, 'created'),
    ('Portfolio Showcase', 'A curated collection of our finest residential transformations from the past decade.', 'website', 'Sophie Martin', '2.0', 15, 'updated')
  `);

  // Seed AI Suggestions (15 items)
  await pool.query(`
    INSERT INTO ai_suggestions (title, original_content, suggestion_type, brand_profile_id, ai_suggestion, status) VALUES
    ('Improve Hero Copy', 'Our AI platform helps businesses work better and faster.', 'tone_enhancement', 1, 'IMPROVED: Accelerate your business transformation with AI-powered intelligence that turns complexity into competitive advantage.\n\nCHANGES: Replaced generic "work better" with specific value props. Added power words aligned with innovative brand tone.', 'completed'),
    ('Warm Up Product Description', 'This cream contains natural ingredients that are good for your skin.', 'brand_alignment', 2, 'IMPROVED: Crafted from natures finest botanicals, this nourishing cream wraps your skin in pure, organic goodness.\n\nCHANGES: Added sensory language, warmth, and brand-specific vocabulary. "Good for" replaced with emotional benefit language.', 'completed'),
    ('Add Edge to Campaign', 'Check out our new collection of clothes for the season.', 'style_upgrade', 3, 'IMPROVED: This seasons drop just hit different. Bold cuts, bolder attitudes. Your wardrobe upgrade starts now.\n\nCHANGES: Infused trendy language and confident tone. Removed generic phrasing. Added urgency and edge.', 'completed'),
    ('Professionalize Report Intro', 'We did well this quarter and made more money than expected.', 'formality_adjustment', 4, 'IMPROVED: Q3 performance exceeded projections, delivering robust returns across all portfolio segments while maintaining our commitment to sustainable growth.\n\nCHANGES: Elevated language to match professional financial advisory tone. Added specificity and authority.', 'completed'),
    ('Simplify for Kids', 'The application provides educational resources for enhanced cognitive development.', 'simplification', 5, 'IMPROVED: Ready to learn something awesome? Jump in and discover amazing new things with fun games and cool challenges!\n\nCHANGES: Transformed formal language into child-friendly, exciting content. Maintained educational value while adding playfulness.', 'completed'),
    ('Elevate Product Copy', 'Our electric car goes really fast and looks nice.', 'premium_positioning', 6, 'IMPROVED: Breathtaking design meets uncompromising performance. The new V-Series delivers exhilarating acceleration that redefines what electric luxury means.\n\nCHANGES: Replaced casual language with premium descriptors. Added brand-appropriate sophistication and power language.', 'completed'),
    ('Clarify Technical Docs', 'Use the function to do the thing with the data in the system.', 'clarity_improvement', 7, 'IMPROVED: Call the processData() method to transform raw inputs into structured outputs. Pass your dataset as the first parameter and specify the output format as the second.\n\nCHANGES: Added specific technical details, method names, and clear parameter guidance. Maintained professional technical tone.', 'completed'),
    ('Enhance Spa Description', 'We have nice massage services that help you feel relaxed.', 'luxury_enhancement', 8, 'IMPROVED: Surrender to the art of healing touch. Our master therapists guide you through a transformative journey of deep relaxation and renewal.\n\nCHANGES: Elevated generic description to luxury experience language. Added sensory and experiential elements.', 'completed'),
    ('Boost Motivation', 'Join our fitness class to get in shape and feel better about yourself.', 'energy_boost', 9, 'IMPROVED: Ready to transform? This isnt just a class — its where you break limits and build the strongest version of yourself. No excuses. Just results.\n\nCHANGES: Injected high-energy, motivational tone. Added direct address and brand-specific intensity language.', 'completed'),
    ('Warm Pet Content', 'Buy our high-quality dog food with premium ingredients.', 'emotional_connection', 10, 'IMPROVED: Because every tail wag matters. Give your beloved companion the premium nutrition they deserve — crafted with love and the finest ingredients.\n\nCHANGES: Added emotional connection and brand warmth. Shifted from transactional to relationship-focused messaging.', 'completed'),
    ('Enhance Coffee Story', 'We sell coffee from different countries.', 'storytelling', 11, 'IMPROVED: From misty Colombian highlands to sun-drenched Ethiopian valleys, each origin tells a unique story — and our master roasters bring that story to life in every cup.\n\nCHANGES: Transformed basic statement into engaging narrative. Added sensory details and artisanal positioning.', 'completed'),
    ('Compassionate Healthcare', 'See our doctors online using our app.', 'empathy_addition', 12, 'IMPROVED: Your health concerns deserve immediate attention. Connect with compassionate, experienced physicians from the comfort of home — because quality care shouldnt wait.\n\nCHANGES: Added empathy and patient-centered language. Emphasized accessibility and care quality.', 'completed'),
    ('Eco-Friendly Enhancement', 'We offer travel tours to beautiful natural locations.', 'sustainability_focus', 13, 'IMPROVED: Journey into pristine wilderness while leaving nothing but footprints. Our eco-conscious adventures support local communities and protect the places we explore together.\n\nCHANGES: Integrated sustainability messaging naturally. Added responsibility without losing adventure appeal.', 'completed'),
    ('Concise Learning Copy', 'We have a comprehensive platform that offers many different courses across various subjects that professionals can take to improve their skills over time.', 'conciseness', 14, 'IMPROVED: Master new skills in minutes a day. Curated, bite-sized lessons designed for professionals who value their time.\n\nCHANGES: Condensed wordy copy into concise, impactful messaging. Emphasized efficiency — core brand value.', 'completed'),
    ('Elevate Design Copy', 'We design nice interiors for homes and offices.', 'sophistication', 15, 'IMPROVED: We transform spaces into living masterpieces — where every detail reflects your unique vision and our unwavering commitment to design excellence.\n\nCHANGES: Elevated simple description to sophisticated brand language. Added elegance and craftsmanship emphasis.', 'completed')
  `);

  // Seed Sentiment Analyses (15 items)
  await pool.query(`
    INSERT INTO sentiment_analyses (title, content, brand_profile_id, ai_analysis, sentiment_score, status) VALUES
    ('Product Launch Announcement', 'We are thrilled to announce our most innovative product yet, designed to revolutionize how businesses operate.', 1, 'OVERALL: Very Positive (0.89)\nEmotions: Joy 45%, Anticipation 30%, Trust 15%, Surprise 10%\nBrand Alignment: Excellent — enthusiasm matches innovative brand personality', 0.89, 'completed'),
    ('Organic Certification Post', 'Proud to share that all our products now carry the USDA Organic certification, reflecting our unwavering commitment to purity.', 2, 'OVERALL: Positive (0.78)\nEmotions: Trust 40%, Joy 30%, Pride 20%, Anticipation 10%\nBrand Alignment: Strong — pride aligns with authentic values', 0.78, 'completed'),
    ('Season End Sale', 'Last chance to grab these iconic pieces before they are gone forever. Dont miss out on defining your style.', 3, 'OVERALL: Moderate Positive (0.52)\nEmotions: Anticipation 35%, Fear of missing out 25%, Excitement 25%, Urgency 15%\nBrand Alignment: Good — urgency appropriate for fashion', 0.52, 'completed'),
    ('Market Downturn Update', 'While markets have experienced volatility, our diversified approach continues to protect and grow your investments.', 4, 'OVERALL: Neutral-Positive (0.35)\nEmotions: Trust 40%, Reassurance 30%, Caution 20%, Confidence 10%\nBrand Alignment: Excellent — measured response maintains trust', 0.35, 'completed'),
    ('App Milestone Celebration', 'One million young learners and counting! Thank you parents and kids for making learning an adventure!', 5, 'OVERALL: Very Positive (0.92)\nEmotions: Joy 50%, Gratitude 25%, Pride 15%, Excitement 10%\nBrand Alignment: Perfect — celebratory and community-focused', 0.92, 'completed'),
    ('Recall Notice', 'We have identified a minor issue with select V6 charging cables. Your safety is our priority — free replacements shipping immediately.', 6, 'OVERALL: Neutral (0.12)\nEmotions: Concern 30%, Responsibility 30%, Trust-building 25%, Urgency 15%\nBrand Alignment: Good — transparent and proactive', 0.12, 'completed'),
    ('Server Downtime Apology', 'We sincerely apologize for todays service disruption. Our team worked through the night to restore full functionality.', 7, 'OVERALL: Slightly Negative (-0.15)\nEmotions: Regret 35%, Responsibility 30%, Determination 25%, Empathy 10%\nBrand Alignment: Appropriate — professional accountability', -0.15, 'completed'),
    ('New Treatment Launch', 'Introducing our exclusive Crystal Healing Journey — where ancient energy meets modern luxury for transcendent relaxation.', 8, 'OVERALL: Positive (0.72)\nEmotions: Serenity 35%, Anticipation 25%, Luxury 25%, Mystique 15%\nBrand Alignment: Excellent — perfectly serene and luxurious', 0.72, 'completed'),
    ('Challenge Results', 'INCREDIBLE! 89% of our 30-day challengers hit their goals! You pushed harder than ever and the results speak for themselves!', 9, 'OVERALL: Very Positive (0.95)\nEmotions: Pride 35%, Joy 30%, Motivation 25%, Energy 10%\nBrand Alignment: Perfect — high energy and results-focused', 0.95, 'completed'),
    ('Product Discontinuation', 'After careful consideration, we are retiring our Classic line to focus on delivering even better nutrition through our Premium range.', 10, 'OVERALL: Neutral (0.20)\nEmotions: Optimism 30%, Slight disappointment 25%, Trust 25%, Forward-looking 20%\nBrand Alignment: Good — caring transition messaging', 0.20, 'completed'),
    ('Barista Competition Win', 'Our head roaster just won the National Barista Championship! Incredible achievement for our craft coffee community.', 11, 'OVERALL: Very Positive (0.88)\nEmotions: Pride 40%, Joy 30%, Community 20%, Excitement 10%\nBrand Alignment: Strong — celebrates craft and community', 0.88, 'completed'),
    ('HIPAA Compliance Update', 'We have enhanced our data protection protocols to exceed HIPAA requirements, ensuring your medical information remains absolutely secure.', 12, 'OVERALL: Neutral-Positive (0.40)\nEmotions: Trust 45%, Security 30%, Professionalism 15%, Care 10%\nBrand Alignment: Good — professional and trustworthy', 0.40, 'completed'),
    ('Climate Impact Report', 'This year our travelers helped plant 50,000 trees and offset 2,000 tons of carbon. Together were making a real difference.', 13, 'OVERALL: Positive (0.75)\nEmotions: Pride 30%, Hope 25%, Community 25%, Inspiration 20%\nBrand Alignment: Excellent — sustainability + community', 0.75, 'completed'),
    ('Course Completion Stats', 'Learners who complete our micro-courses report 40% faster career advancement. Proof that small steps lead to big leaps.', 14, 'OVERALL: Positive (0.70)\nEmotions: Confidence 35%, Motivation 25%, Trust 20%, Aspiration 20%\nBrand Alignment: Strong — data-driven and encouraging', 0.70, 'completed'),
    ('Design Award Announcement', 'Honored to receive the International Design Excellence Award for our Skyline Penthouse project. Every detail matters.', 15, 'OVERALL: Positive (0.82)\nEmotions: Pride 35%, Gratitude 25%, Achievement 25%, Elegance 15%\nBrand Alignment: Perfect — sophisticated and accomplished', 0.82, 'completed')
  `);

  // Seed Multi-Language Voices (15 items)
  await pool.query(`
    INSERT INTO multi_language_voices (title, source_content, source_language, target_language, brand_profile_id, ai_analysis, quality_score, status) VALUES
    ('Homepage Tagline', 'Innovate. Transform. Succeed.', 'English', 'Spanish', 1, 'TRANSLATED: Innova. Transforma. Triunfa.\nCULTURAL NOTES: Maintained imperative verb structure. "Triunfa" chosen over "Éxito" for stronger call to action.', 92, 'completed'),
    ('Product Description', 'Pure organic goodness from farm to table.', 'English', 'French', 2, 'TRANSLATED: La pure bonté biologique, de la ferme à votre table.\nCULTURAL NOTES: French consumers value "terroir" concept — leveraged farm-to-table messaging.', 90, 'completed'),
    ('Fashion Campaign', 'Break the mold. Define your style.', 'English', 'Japanese', 3, 'TRANSLATED: 型を破れ。自分のスタイルを創れ。\nCULTURAL NOTES: Used casual imperative form for youth audience. Maintained rebellious energy.', 88, 'completed'),
    ('Investment Report Header', 'Building wealth with confidence and trust.', 'English', 'German', 4, 'TRANSLATED: Vermögen aufbauen mit Vertrauen und Zuversicht.\nCULTURAL NOTES: German financial language tends toward formality — maintained professional tone.', 94, 'completed'),
    ('Kids App Welcome', 'Ready for an adventure in learning?', 'English', 'Portuguese', 5, 'TRANSLATED: Pronto para uma aventura de aprendizado?\nCULTURAL NOTES: Used informal "pronto" for child-friendly tone. Brazilian Portuguese variant.', 91, 'completed'),
    ('EV Launch Slogan', 'Zero emissions. Maximum performance.', 'English', 'Mandarin', 6, 'TRANSLATED: 零排放。极致性能。\nCULTURAL NOTES: "极致" (extreme/ultimate) conveys premium positioning in Chinese market.', 89, 'completed'),
    ('Cloud Platform Tagline', 'Scale without limits.', 'English', 'Hindi', 7, 'TRANSLATED: बिना सीमा के विस्तार करें।\nCULTURAL NOTES: Used formal Hindi appropriate for B2B. Technical terminology adapted for Indian market.', 87, 'completed'),
    ('Spa Experience', 'Surrender to serenity.', 'English', 'Italian', 8, 'TRANSLATED: Abbandonati alla serenità.\nCULTURAL NOTES: Italian luxury language naturally aligns. Informal "abbandonati" creates intimacy.', 95, 'completed'),
    ('Fitness Challenge', 'No excuses. Just results.', 'English', 'Korean', 9, 'TRANSLATED: 변명 없이. 오직 결과만.\nCULTURAL NOTES: Direct Korean phrasing maintains motivational impact. Appropriate for fitness culture.', 90, 'completed'),
    ('Pet Care Promise', 'Because they deserve the best.', 'English', 'Dutch', 10, 'TRANSLATED: Omdat ze het beste verdienen.\nCULTURAL NOTES: Dutch directness preserved. Emotional connection maintained without being overly sentimental.', 88, 'completed'),
    ('Coffee Origin Story', 'Every bean tells a story.', 'English', 'Arabic', 11, 'TRANSLATED: كل حبة قهوة تروي قصة\nCULTURAL NOTES: Arabic coffee culture is deeply rooted — translated with reverence for the tradition.', 93, 'completed'),
    ('Healthcare Promise', 'Quality care, anytime.', 'English', 'Turkish', 12, 'TRANSLATED: Kaliteli bakım, her zaman.\nCULTURAL NOTES: Simple and direct. "Bakım" encompasses both medical and personal care in Turkish.', 91, 'completed'),
    ('Eco Travel Motto', 'Adventure meets responsibility.', 'English', 'Swedish', 13, 'TRANSLATED: Äventyr möter ansvar.\nCULTURAL NOTES: Swedish environmental consciousness strong — sustainability message resonates naturally.', 94, 'completed'),
    ('Learning Platform', 'Master skills in minutes.', 'English', 'Russian', 14, 'TRANSLATED: Освойте навыки за минуты.\nCULTURAL NOTES: Used formal imperative for professional audience. Efficiency message clear.', 89, 'completed'),
    ('Design Excellence', 'Where vision meets craftsmanship.', 'English', 'Polish', 15, 'TRANSLATED: Gdzie wizja spotyka rzemiosło.\nCULTURAL NOTES: Polish appreciation for craftsmanship makes this message resonate. Maintained elegance.', 92, 'completed')
  `);

  console.log('Database seeded successfully!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
