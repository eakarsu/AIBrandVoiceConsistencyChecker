-- Additive native schema bootstrap. No existing row or account is reset.
CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'viewer',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS brand_profiles (
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

    CREATE TABLE IF NOT EXISTS content_analyses (
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

    CREATE TABLE IF NOT EXISTS tone_detections (
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

    CREATE TABLE IF NOT EXISTS style_guide_rules (
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

    CREATE TABLE IF NOT EXISTS channels (
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

    CREATE TABLE IF NOT EXISTS content_scores (
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

    CREATE TABLE IF NOT EXISTS vocabulary_terms (
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

    CREATE TABLE IF NOT EXISTS competitor_analyses (
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

    CREATE TABLE IF NOT EXISTS content_templates (
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

    CREATE TABLE IF NOT EXISTS audit_reports (
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

    CREATE TABLE IF NOT EXISTS team_members (
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

    CREATE TABLE IF NOT EXISTS content_history (
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

    CREATE TABLE IF NOT EXISTS ai_suggestions (
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

    CREATE TABLE IF NOT EXISTS sentiment_analyses (
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

    CREATE TABLE IF NOT EXISTS multi_language_voices (
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
