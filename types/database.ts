export type UserRole = 'teacher' | 'student';
export type ClassType = 'group' | 'personal';
export type EnrollmentStatus = 'active' | 'inactive' | 'trial' | 'pending';
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type CheckinStatus = 'confirmed' | 'attended' | 'missed' | 'cancelled';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type MessageType = 'text' | 'image' | 'system';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'pix' | 'credit_card' | 'cash';
export type ReminderChannel = 'push' | 'email' | 'whatsapp';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  bio: string | null;
  specialties: string[] | null;
  instagram: string | null;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  description: string | null;
  modality: string | null;
  type: ClassType;
  max_students: number;
  price_per_class: number | null;
  monthly_price: number | null;
  color: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
}

export interface ClassSchedule {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string | null;
}

export interface Session {
  id: string;
  class_id: string;
  schedule_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: SessionStatus;
  notes: string | null;
  location: string | null;
  created_at: string;
}

export interface Checkin {
  id: string;
  session_id: string;
  student_id: string;
  status: CheckinStatus;
  checked_in_at: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  teacher_id: string;
  student_id: string;
  class_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  location: string | null;
  notes: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  class_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  created_at: string;
}

export interface Payment {
  id: string;
  teacher_id: string;
  student_id: string;
  class_id: string | null;
  amount: number;
  status: PaymentStatus;
  due_date: string;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  abacatepay_id: string | null;
  description: string | null;
  created_at: string;
}

export interface PaymentReminder {
  id: string;
  payment_id: string;
  sent_at: string;
  channel: ReminderChannel;
}

export interface TeacherAvailability {
  id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

/** Supabase Database type for typed client */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          role: UserRole;
          bio?: string | null;
          specialties?: string[] | null;
          instagram?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          role?: UserRole;
          bio?: string | null;
          specialties?: string[] | null;
          instagram?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      classes: {
        Row: Class;
        Insert: {
          id?: string;
          teacher_id: string;
          name: string;
          description?: string | null;
          modality?: string | null;
          type?: ClassType;
          max_students?: number;
          price_per_class?: number | null;
          monthly_price?: number | null;
          color?: string;
          location?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          name?: string;
          description?: string | null;
          modality?: string | null;
          type?: ClassType;
          max_students?: number;
          price_per_class?: number | null;
          monthly_price?: number | null;
          color?: string;
          location?: string | null;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'classes_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      class_enrollments: {
        Row: ClassEnrollment;
        Insert: {
          id?: string;
          class_id: string;
          student_id: string;
          status?: EnrollmentStatus;
          enrolled_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          student_id?: string;
          status?: EnrollmentStatus;
          enrolled_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'class_enrollments_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'class_enrollments_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      class_schedules: {
        Row: ClassSchedule;
        Insert: {
          id?: string;
          class_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          location?: string | null;
        };
        Update: {
          id?: string;
          class_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          location?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'class_schedules_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
        ];
      };
      class_sessions: {
        Row: Session;
        Insert: {
          id?: string;
          class_id: string;
          schedule_id?: string | null;
          date: string;
          start_time: string;
          end_time: string;
          status?: SessionStatus;
          notes?: string | null;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          schedule_id?: string | null;
          date?: string;
          start_time?: string;
          end_time?: string;
          status?: SessionStatus;
          notes?: string | null;
          location?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_schedule_id_fkey';
            columns: ['schedule_id'];
            isOneToOne: false;
            referencedRelation: 'class_schedules';
            referencedColumns: ['id'];
          },
        ];
      };
      checkins: {
        Row: Checkin;
        Insert: {
          id?: string;
          session_id: string;
          student_id: string;
          status?: CheckinStatus;
          checked_in_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          student_id?: string;
          status?: CheckinStatus;
          checked_in_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'checkins_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'class_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkins_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: Booking;
        Insert: {
          id?: string;
          teacher_id: string;
          student_id: string;
          class_id?: string | null;
          date: string;
          start_time: string;
          end_time: string;
          status?: BookingStatus;
          location?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          student_id?: string;
          class_id?: string | null;
          date?: string;
          start_time?: string;
          end_time?: string;
          status?: BookingStatus;
          location?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: Message;
        Insert: {
          id?: string;
          class_id: string;
          sender_id: string;
          content: string;
          type?: MessageType;
          created_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          sender_id?: string;
          content?: string;
          type?: MessageType;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: Payment;
        Insert: {
          id?: string;
          teacher_id: string;
          student_id: string;
          class_id?: string | null;
          amount: number;
          status?: PaymentStatus;
          due_date: string;
          paid_at?: string | null;
          payment_method?: PaymentMethod | null;
          abacatepay_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          student_id?: string;
          class_id?: string | null;
          amount?: number;
          status?: PaymentStatus;
          due_date?: string;
          paid_at?: string | null;
          payment_method?: PaymentMethod | null;
          abacatepay_id?: string | null;
          description?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_reminders: {
        Row: PaymentReminder;
        Insert: {
          id?: string;
          payment_id: string;
          sent_at?: string;
          channel: ReminderChannel;
        };
        Update: {
          id?: string;
          payment_id?: string;
          sent_at?: string;
          channel?: ReminderChannel;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_reminders_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
      };
      teacher_availability: {
        Row: TeacherAvailability;
        Insert: {
          id?: string;
          teacher_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_available?: boolean;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          is_available?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_availability_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
