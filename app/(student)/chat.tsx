import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Avatar, EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

interface ChatItem {
  classId: string;
  className: string;
  classColor: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  lastMessageSender: string | null;
  unreadCount: number;
}

export default function StudentChat() {
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;

  const { data: chatList, isLoading } = useQuery({
    queryKey: ['student-chats', userId],
    queryFn: async () => {
      // Get enrolled classes
      const { data: enrollments, error: enrollErr } = await supabase
        .from('class_enrollments')
        .select('class_id, classes:class_id(id, name, color)')
        .eq('student_id', userId!)
        .eq('status', 'active');

      if (enrollErr) throw enrollErr;
      if (!enrollments?.length) return [];

      const classIds = enrollments.map((e: any) => e.class_id);

      // Get latest messages for each class
      const { data: messages, error: msgErr } = await supabase
        .from('messages')
        .select('*, sender:sender_id(full_name)')
        .in('class_id', classIds)
        .order('created_at', { ascending: false });

      if (msgErr) throw msgErr;

      // Build chat list
      const chats: ChatItem[] = enrollments.map((e: any) => {
        const cls = e.classes;
        const classMessages = messages?.filter((m: any) => m.class_id === e.class_id) ?? [];
        const latest = classMessages[0];

        return {
          classId: cls.id,
          className: cls.name,
          classColor: cls.color,
          lastMessage: latest?.content ?? null,
          lastMessageTime: latest?.created_at ?? null,
          lastMessageSender:
            latest?.sender_id === userId
              ? 'Você'
              : latest?.sender?.full_name?.split(' ')[0] ?? null,
          unreadCount: 0, // Placeholder - would need read tracking
        };
      });

      // Sort by most recent message
      chats.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      return chats;
    },
    enabled: !!userId,
  });

  const renderChatItem = ({ item }: { item: ChatItem }) => {
    return (
      <Pressable
        onPress={() => router.push(`/(student)/chat/${item.classId}`)}
        style={({ pressed }) => [
          styles.chatItem,
          pressed && styles.chatItemPressed,
        ]}
      >
        <View
          style={[
            styles.chatAvatar,
            { backgroundColor: item.classColor + '20' },
          ]}
        >
          <Text style={[styles.chatAvatarText, { color: item.classColor }]}>
            {item.className.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.className}
            </Text>
            {item.lastMessageTime && (
              <Text style={styles.chatTime}>
                {formatMessageTime(item.lastMessageTime)}
              </Text>
            )}
          </View>
          <View style={styles.chatPreviewRow}>
            <Text style={styles.chatPreview} numberOfLines={1}>
              {item.lastMessage
                ? item.lastMessageSender
                  ? `${item.lastMessageSender}: ${item.lastMessage}`
                  : item.lastMessage
                : 'Nenhuma mensagem ainda'}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padding={false}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Conversas</Text>
        <Text style={styles.screenSubtitle}>
          Grupos das suas aulas
        </Text>
      </View>

      {chatList?.length ? (
        <FlatList
          data={chatList}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.classId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <EmptyState
          icon={<MessageSquare size={48} color={theme.colors.neutral[300]} />}
          title="Nenhuma conversa"
          description="Quando você estiver matriculado em uma aula, o grupo de conversa aparecerá aqui."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  screenTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: 24,
    color: theme.colors.neutral[900],
  },
  screenSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.xs,
  },
  list: {
    paddingBottom: theme.spacing.xxl,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  chatItemPressed: {
    backgroundColor: theme.colors.neutral[50],
  },
  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  chatAvatarText: {
    fontFamily: theme.fonts.heading,
    fontSize: 20,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontFamily: theme.fonts.subheading,
    fontSize: 15,
    color: theme.colors.neutral[800],
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  chatTime: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.neutral[400],
  },
  chatPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatPreview: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.neutral[500],
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontFamily: theme.fonts.caption,
    fontSize: 11,
    color: '#FFFFFF',
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.neutral[100],
    marginLeft: 76,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
