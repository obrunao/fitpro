import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Avatar, EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';

interface ChatPreview {
  classId: string;
  className: string;
  classColor: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 7) return `${diffD}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function ChatScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['teacher-chats', profile?.id],
    queryFn: async () => {
      // Fetch teacher's classes
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name, color')
        .eq('teacher_id', profile!.id)
        .eq('is_active', true)
        .order('name');
      if (classError) throw classError;
      if (!classes || classes.length === 0) return [];

      const classIds = classes.map((c) => c.id);

      // Fetch last message for each class
      const chatPreviews: ChatPreview[] = [];

      for (const cls of classes) {
        const { data: messages } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('class_id', cls.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMsg = messages?.[0] ?? null;

        // Count unread (messages from others after teacher's last read)
        // For now, show 0 as placeholder since we don't have a read_at tracking
        chatPreviews.push({
          classId: cls.id,
          className: cls.name,
          classColor: cls.color,
          lastMessage: lastMsg?.content ?? null,
          lastMessageAt: lastMsg?.created_at ?? null,
          unreadCount: 0,
        });
      }

      // Sort by last message time, most recent first
      chatPreviews.sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0;
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });

      return chatPreviews;
    },
    enabled: !!profile?.id,
  });

  const renderChatItem = ({ item }: { item: ChatPreview }) => (
    <Pressable
      onPress={() => router.push(`/(teacher)/chat/${item.classId}`)}
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

      <View style={styles.chatInfo}>
        <View style={styles.chatTopRow}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.className}
          </Text>
          {item.lastMessageAt && (
            <Text style={styles.chatTime}>
              {formatRelativeTime(item.lastMessageAt)}
            </Text>
          )}
        </View>
        <View style={styles.chatBottomRow}>
          <Text style={styles.chatPreview} numberOfLines={1}>
            {item.lastMessage ?? 'Nenhuma mensagem ainda'}
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

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padding={false}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Conversas</Text>
        <Text style={styles.screenSubtitle}>Grupos das suas turmas</Text>
      </View>

      {chats.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={48} color={theme.colors.neutral[300]} />}
          title="Nenhuma conversa"
          description="Crie uma turma para comecar a conversar com seus alunos"
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.classId}
          renderItem={renderChatItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  screenTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: 26,
    color: theme.colors.neutral[900],
  },
  screenSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: theme.spacing.lg,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
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
  },
  chatAvatarText: {
    fontFamily: theme.fonts.heading,
    fontSize: 20,
  },
  chatInfo: {
    flex: 1,
    gap: 4,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontFamily: theme.fonts.subheading,
    fontSize: 15,
    color: theme.colors.neutral[800],
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  chatTime: {
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.neutral[400],
  },
  chatBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    borderRadius: theme.radius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontFamily: theme.fonts.subheading,
    fontSize: 11,
    color: theme.colors.neutral[0],
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.neutral[100],
    marginLeft: 80,
  },
});
