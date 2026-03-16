import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui';
import { theme } from '@/constants/theme';
import type { Message, Profile } from '@/types/database';

interface MessageWithSender extends Message {
  profiles: Pick<Profile, 'full_name' | 'avatar_url'>;
}

export default function ChatDetailScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles(full_name, avatar_url)')
        .eq('class_id', classId!)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return data as MessageWithSender[];
    },
    enabled: !!classId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('messages').insert({
        class_id: classId!,
        sender_id: session!.user.id,
        content,
        type: 'text',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', classId] });
      setText('');
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!classId) return;
    const channel = supabase
      .channel(`messages:${classId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `class_id=eq.${classId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', classId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  const isMe = (senderId: string) => senderId === session?.user.id;

  const renderMessage = ({ item }: { item: MessageWithSender }) => {
    const mine = isMe(item.sender_id);
    return (
      <View style={[styles.messageRow, mine && styles.messageRowMine]}>
        {!mine && (
          <Avatar
            name={item.profiles?.full_name ?? '?'}
            uri={item.profiles?.avatar_url}
            size={32}
          />
        )}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          {!mine && (
            <Text style={styles.senderName}>{item.profiles?.full_name}</Text>
          )}
          <Text style={[styles.messageText, mine && styles.messageTextMine]}>
            {item.content}
          </Text>
          <Text style={[styles.time, mine && styles.timeMine]}>
            {new Date(item.created_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Mensagem..."
          placeholderTextColor={theme.colors.neutral[400]}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
        >
          <Send size={20} color="#FFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.neutral[50] },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: theme.spacing.md, paddingBottom: theme.spacing.sm },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  messageRowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%',
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
  },
  bubbleOther: {
    backgroundColor: theme.colors.neutral[0],
    borderBottomLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: theme.colors.primary[500],
    borderBottomRightRadius: 4,
  },
  senderName: {
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.primary[600],
    marginBottom: 2,
  },
  messageText: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.neutral[800],
  },
  messageTextMine: { color: '#FFF' },
  time: {
    fontFamily: theme.fonts.body,
    fontSize: 10,
    color: theme.colors.neutral[400],
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.neutral[800],
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
