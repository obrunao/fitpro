import { Tabs } from 'expo-router';
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  User,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';

const ACTIVE_COLOR = '#FF6B35';
const INACTIVE_COLOR = '#A09D95';

export default function TeacherLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: theme.colors.neutral[0],
          borderTopColor: theme.colors.neutral[200],
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.caption,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Turmas',
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="classes/create"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="classes/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="chat/[classId]"
        options={{ href: null }}
      />
    </Tabs>
  );
}
