-- ============================================================================
-- FitPro - Initial Schema Migration
-- Plataforma de gerenciamento de aulas fitness para professores e alunos
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES - extends auth.users
-- ============================================================================
CREATE TABLE profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   text NOT NULL,
    avatar_url  text,
    phone       text,
    role        text NOT NULL CHECK (role IN ('teacher', 'student')),
    bio         text,
    specialties text[],
    instagram   text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. CLASSES - fitness classes / groups
-- ============================================================================
CREATE TABLE classes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name            text NOT NULL,
    description     text,
    modality        text,                          -- 'Musculacao', 'Crossfit', 'Pilates', etc.
    type            text CHECK (type IN ('group', 'personal')),
    max_students    int DEFAULT 30,
    price_per_class numeric(10,2),
    monthly_price   numeric(10,2),
    color           text DEFAULT '#10B981',
    is_active       boolean DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. CLASS_ENROLLMENTS - student <-> class relationships
-- ============================================================================
CREATE TABLE class_enrollments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status      text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('active', 'inactive', 'trial', 'pending')),
    enrolled_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE (class_id, student_id)
);

-- ============================================================================
-- 4. CLASS_SCHEDULES - recurring weekly schedules
-- ============================================================================
CREATE TABLE class_schedules (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Dom, 6=Sab
    start_time  time NOT NULL,
    end_time    time NOT NULL,
    location    text,

    CHECK (end_time > start_time)
);

-- ============================================================================
-- 5. SESSIONS - actual class instances
-- ============================================================================
CREATE TABLE sessions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    schedule_id uuid REFERENCES class_schedules(id) ON DELETE SET NULL,
    date        date NOT NULL,
    start_time  time NOT NULL,
    end_time    time NOT NULL,
    status      text NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    notes       text,
    location    text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. CHECKINS - student attendance
-- ============================================================================
CREATE TABLE checkins (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status        text NOT NULL DEFAULT 'confirmed'
                      CHECK (status IN ('confirmed', 'attended', 'missed', 'cancelled')),
    checked_in_at timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),

    UNIQUE (session_id, student_id)
);

-- ============================================================================
-- 7. BOOKINGS - personal training bookings
-- ============================================================================
CREATE TABLE bookings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    class_id    uuid REFERENCES classes(id) ON DELETE SET NULL,
    date        date NOT NULL,
    start_time  time NOT NULL,
    end_time    time NOT NULL,
    status      text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    location    text,
    notes       text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. MESSAGES - class group chat
-- ============================================================================
CREATE TABLE messages (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id   uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    sender_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content    text NOT NULL,
    type       text NOT NULL DEFAULT 'text'
                   CHECK (type IN ('text', 'image', 'system')),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 9. PAYMENTS
-- ============================================================================
CREATE TABLE payments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    class_id        uuid REFERENCES classes(id) ON DELETE SET NULL,
    amount          numeric(10,2) NOT NULL,
    status          text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    due_date        date,
    paid_at         timestamptz,
    payment_method  text,
    abacatepay_id   text,
    description     text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. PAYMENT_REMINDERS
-- ============================================================================
CREATE TABLE payment_reminders (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    sent_at    timestamptz NOT NULL DEFAULT now(),
    channel    text NOT NULL CHECK (channel IN ('push', 'email', 'whatsapp'))
);

-- ============================================================================
-- 11. TEACHER_AVAILABILITY - for personal training booking
-- ============================================================================
CREATE TABLE teacher_availability (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    day_of_week  int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time   time NOT NULL,
    end_time     time NOT NULL,
    is_available boolean NOT NULL DEFAULT true,

    CHECK (end_time > start_time)
);


-- ============================================================================
-- INDEXES
-- ============================================================================

-- profiles
CREATE INDEX idx_profiles_role ON profiles(role);

-- classes
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_modality   ON classes(modality);
CREATE INDEX idx_classes_is_active  ON classes(is_active);

-- class_enrollments
CREATE INDEX idx_class_enrollments_class_id   ON class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX idx_class_enrollments_status     ON class_enrollments(status);

-- class_schedules
CREATE INDEX idx_class_schedules_class_id    ON class_schedules(class_id);
CREATE INDEX idx_class_schedules_day_of_week ON class_schedules(day_of_week);

-- sessions
CREATE INDEX idx_sessions_class_id    ON sessions(class_id);
CREATE INDEX idx_sessions_schedule_id ON sessions(schedule_id);
CREATE INDEX idx_sessions_date        ON sessions(date);
CREATE INDEX idx_sessions_status      ON sessions(status);
CREATE INDEX idx_sessions_class_date  ON sessions(class_id, date);

-- checkins
CREATE INDEX idx_checkins_session_id ON checkins(session_id);
CREATE INDEX idx_checkins_student_id ON checkins(student_id);
CREATE INDEX idx_checkins_status     ON checkins(status);

-- bookings
CREATE INDEX idx_bookings_teacher_id ON bookings(teacher_id);
CREATE INDEX idx_bookings_student_id ON bookings(student_id);
CREATE INDEX idx_bookings_class_id   ON bookings(class_id);
CREATE INDEX idx_bookings_date       ON bookings(date);
CREATE INDEX idx_bookings_status     ON bookings(status);

-- messages
CREATE INDEX idx_messages_class_id   ON messages(class_id);
CREATE INDEX idx_messages_sender_id  ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- payments
CREATE INDEX idx_payments_teacher_id ON payments(teacher_id);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_class_id   ON payments(class_id);
CREATE INDEX idx_payments_status     ON payments(status);
CREATE INDEX idx_payments_due_date   ON payments(due_date);

-- payment_reminders
CREATE INDEX idx_payment_reminders_payment_id ON payment_reminders(payment_id);

-- teacher_availability
CREATE INDEX idx_teacher_availability_teacher_id  ON teacher_availability(teacher_id);
CREATE INDEX idx_teacher_availability_day_of_week ON teacher_availability(day_of_week);


-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- AUTO-CREATE PROFILE ON AUTH.USERS INSERT
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_availability ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- PROFILES
-- --------------------------------------------------------------------------
-- Everyone authenticated can read any profile (for class lists, teacher pages)
CREATE POLICY profiles_select ON profiles
    FOR SELECT TO authenticated
    USING (true);

-- Users can update only their own profile
CREATE POLICY profiles_update ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- --------------------------------------------------------------------------
-- CLASSES
-- --------------------------------------------------------------------------
-- Anyone authenticated can view active classes
CREATE POLICY classes_select ON classes
    FOR SELECT TO authenticated
    USING (true);

-- Teachers can insert their own classes
CREATE POLICY classes_insert ON classes
    FOR INSERT TO authenticated
    WITH CHECK (
        teacher_id = auth.uid()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
    );

-- Teachers can update their own classes
CREATE POLICY classes_update ON classes
    FOR UPDATE TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- Teachers can delete their own classes
CREATE POLICY classes_delete ON classes
    FOR DELETE TO authenticated
    USING (teacher_id = auth.uid());

-- --------------------------------------------------------------------------
-- CLASS_ENROLLMENTS
-- --------------------------------------------------------------------------
-- Teachers see enrollments for their classes; students see their own
CREATE POLICY enrollments_select ON class_enrollments
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_enrollments.class_id
              AND classes.teacher_id = auth.uid()
        )
    );

-- Teachers can manage enrollments for their classes
CREATE POLICY enrollments_insert ON class_enrollments
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_enrollments.class_id
              AND classes.teacher_id = auth.uid()
        )
    );

CREATE POLICY enrollments_update ON class_enrollments
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_enrollments.class_id
              AND classes.teacher_id = auth.uid()
        )
    );

CREATE POLICY enrollments_delete ON class_enrollments
    FOR DELETE TO authenticated
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_enrollments.class_id
              AND classes.teacher_id = auth.uid()
        )
    );

-- --------------------------------------------------------------------------
-- CLASS_SCHEDULES
-- --------------------------------------------------------------------------
-- Anyone authenticated can view schedules
CREATE POLICY schedules_select ON class_schedules
    FOR SELECT TO authenticated
    USING (true);

-- Teachers can manage schedules for their classes
CREATE POLICY schedules_insert ON class_schedules
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_schedules.class_id
              AND classes.teacher_id = auth.uid()
        )
    );

CREATE POLICY schedules_update ON class_schedules
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_schedules.class_id
              AND classes.teacher_id = auth.uid()
        )
    );

CREATE POLICY schedules_delete ON class_schedules
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_schedules.class_id
              AND classes.teacher_id = auth.uid()
        )
    );

-- --------------------------------------------------------------------------
-- SESSIONS
-- --------------------------------------------------------------------------
-- Teachers see their class sessions; enrolled students see theirs
CREATE POLICY sessions_select ON sessions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = sessions.class_id
              AND classes.teacher_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM class_enrollments
            WHERE class_enrollments.class_id = sessions.class_id
              AND class_enrollments.student_id = auth.uid()
              AND class_enrollments.status = 'active'
        )
    );

-- Teachers can create/update/delete sessions for their classes
CREATE POLICY sessions_insert ON sessions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = sessions.class_id
              AND classes.teacher_id = auth.uid()
        )
    );

CREATE POLICY sessions_update ON sessions
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = sessions.class_id
              AND classes.teacher_id = auth.uid()
        )
    );

CREATE POLICY sessions_delete ON sessions
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = sessions.class_id
              AND classes.teacher_id = auth.uid()
        )
    );

-- --------------------------------------------------------------------------
-- CHECKINS
-- --------------------------------------------------------------------------
-- Teachers see checkins for their sessions; students see their own
CREATE POLICY checkins_select ON checkins
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM sessions
            JOIN classes ON classes.id = sessions.class_id
            WHERE sessions.id = checkins.session_id
              AND classes.teacher_id = auth.uid()
        )
    );

-- Teachers can create/update checkins; students can check themselves in
CREATE POLICY checkins_insert ON checkins
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM sessions
            JOIN classes ON classes.id = sessions.class_id
            WHERE sessions.id = checkins.session_id
              AND classes.teacher_id = auth.uid()
        )
    );

CREATE POLICY checkins_update ON checkins
    FOR UPDATE TO authenticated
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM sessions
            JOIN classes ON classes.id = sessions.class_id
            WHERE sessions.id = checkins.session_id
              AND classes.teacher_id = auth.uid()
        )
    );

-- --------------------------------------------------------------------------
-- BOOKINGS
-- --------------------------------------------------------------------------
-- Teachers and students see their own bookings
CREATE POLICY bookings_select ON bookings
    FOR SELECT TO authenticated
    USING (teacher_id = auth.uid() OR student_id = auth.uid());

-- Students can create bookings; teachers can too
CREATE POLICY bookings_insert ON bookings
    FOR INSERT TO authenticated
    WITH CHECK (teacher_id = auth.uid() OR student_id = auth.uid());

-- Both parties can update
CREATE POLICY bookings_update ON bookings
    FOR UPDATE TO authenticated
    USING (teacher_id = auth.uid() OR student_id = auth.uid());

-- Both parties can cancel (delete)
CREATE POLICY bookings_delete ON bookings
    FOR DELETE TO authenticated
    USING (teacher_id = auth.uid() OR student_id = auth.uid());

-- --------------------------------------------------------------------------
-- MESSAGES
-- --------------------------------------------------------------------------
-- Class members (teacher + enrolled students) can read messages
CREATE POLICY messages_select ON messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = messages.class_id
              AND classes.teacher_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM class_enrollments
            WHERE class_enrollments.class_id = messages.class_id
              AND class_enrollments.student_id = auth.uid()
              AND class_enrollments.status = 'active'
        )
    );

-- Class members can send messages
CREATE POLICY messages_insert ON messages
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND (
            EXISTS (
                SELECT 1 FROM classes
                WHERE classes.id = messages.class_id
                  AND classes.teacher_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM class_enrollments
                WHERE class_enrollments.class_id = messages.class_id
                  AND class_enrollments.student_id = auth.uid()
                  AND class_enrollments.status = 'active'
            )
        )
    );

-- --------------------------------------------------------------------------
-- PAYMENTS
-- --------------------------------------------------------------------------
-- Teachers see payments they created; students see their own
CREATE POLICY payments_select ON payments
    FOR SELECT TO authenticated
    USING (teacher_id = auth.uid() OR student_id = auth.uid());

-- Teachers can create payments
CREATE POLICY payments_insert ON payments
    FOR INSERT TO authenticated
    WITH CHECK (
        teacher_id = auth.uid()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
    );

-- Teachers can update their payments
CREATE POLICY payments_update ON payments
    FOR UPDATE TO authenticated
    USING (teacher_id = auth.uid());

-- Teachers can delete their payments
CREATE POLICY payments_delete ON payments
    FOR DELETE TO authenticated
    USING (teacher_id = auth.uid());

-- --------------------------------------------------------------------------
-- PAYMENT_REMINDERS
-- --------------------------------------------------------------------------
-- Teachers see reminders for their payments
CREATE POLICY payment_reminders_select ON payment_reminders
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM payments
            WHERE payments.id = payment_reminders.payment_id
              AND payments.teacher_id = auth.uid()
        )
    );

-- Teachers can create reminders
CREATE POLICY payment_reminders_insert ON payment_reminders
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM payments
            WHERE payments.id = payment_reminders.payment_id
              AND payments.teacher_id = auth.uid()
        )
    );

-- --------------------------------------------------------------------------
-- TEACHER_AVAILABILITY
-- --------------------------------------------------------------------------
-- Anyone authenticated can view availability (for booking UI)
CREATE POLICY availability_select ON teacher_availability
    FOR SELECT TO authenticated
    USING (true);

-- Teachers can manage their own availability
CREATE POLICY availability_insert ON teacher_availability
    FOR INSERT TO authenticated
    WITH CHECK (
        teacher_id = auth.uid()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
    );

CREATE POLICY availability_update ON teacher_availability
    FOR UPDATE TO authenticated
    USING (teacher_id = auth.uid());

CREATE POLICY availability_delete ON teacher_availability
    FOR DELETE TO authenticated
    USING (teacher_id = auth.uid());
