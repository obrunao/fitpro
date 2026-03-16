import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Camera,
  Mail,
  Phone,
  FileText,
  Award,
  Instagram,
  LogOut,
} from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Avatar, Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function ProfileScreen() {
  const { profile, signOut, updateProfile, loading } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [specialties, setSpecialties] = useState(
    profile?.specialties?.join(', ') ?? ''
  );
  const [instagram, setInstagram] = useState(profile?.instagram ?? '');

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Erro', 'O nome completo e obrigatorio.');
      return;
    }

    setSaving(true);
    try {
      const specialtiesArray = specialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        specialties: specialtiesArray.length > 0 ? specialtiesArray : null,
        instagram: instagram.trim() || null,
      });

      setEditing(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch {
      Alert.alert('Erro', 'Nao foi possivel atualizar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      signOut();
    } else {
      Alert.alert('Sair', 'Tem certeza que deseja sair da sua conta?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => signOut() },
      ]);
    }
  };

  const handleCancelEdit = () => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    setBio(profile?.bio ?? '');
    setSpecialties(profile?.specialties?.join(', ') ?? '');
    setInstagram(profile?.instagram ?? '');
    setEditing(false);
  };

  if (loading || !profile) {
    return (
      <Screen scroll={false}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll padding>
      {/* Cover Header */}
      <View style={styles.coverHeader}>
        <View style={styles.coverBg} />
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            <Avatar
              uri={profile.avatar_url}
              name={profile.full_name}
              size={88}
            />
            {editing && (
              <Pressable style={styles.editAvatarButton} onPress={() => {}}>
                <Camera size={14} color={theme.colors.neutral[0]} />
              </Pressable>
            )}
          </View>
          {!editing && (
            <View style={styles.nameArea}>
              <Text style={styles.profileName}>{profile.full_name}</Text>
              <Text style={styles.profileRole}>Professor(a)</Text>
            </View>
          )}
        </View>
      </View>

      {editing ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.formCard}>
            <Input
              label="Nome completo"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Seu nome completo"
              icon={<FileText size={18} color={theme.colors.neutral[400]} />}
            />

            <Input
              label="Telefone"
              value={phone}
              onChangeText={setPhone}
              placeholder="(11) 99999-9999"
              keyboardType="phone-pad"
              icon={<Phone size={18} color={theme.colors.neutral[400]} />}
              containerStyle={styles.fieldGap}
            />

            <Input
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Conte um pouco sobre voce..."
              multiline
              numberOfLines={3}
              icon={<FileText size={18} color={theme.colors.neutral[400]} />}
              containerStyle={styles.fieldGap}
            />

            <Input
              label="Especialidades"
              value={specialties}
              onChangeText={setSpecialties}
              placeholder="Musculacao, Pilates, Yoga..."
              icon={<Award size={18} color={theme.colors.neutral[400]} />}
              containerStyle={styles.fieldGap}
            />

            <Input
              label="Instagram"
              value={instagram}
              onChangeText={setInstagram}
              placeholder="@seuinstagram"
              autoCapitalize="none"
              icon={<Instagram size={18} color={theme.colors.neutral[400]} />}
              containerStyle={styles.fieldGap}
            />

            <View style={styles.formActions}>
              <Button
                title="Cancelar"
                onPress={handleCancelEdit}
                variant="ghost"
                style={{ flex: 1 }}
              />
              <Button
                title="Salvar"
                onPress={handleSave}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <>
          <View style={styles.infoCard}>
            <InfoRow icon={<Mail size={18} color={theme.colors.neutral[400]} />} label="E-mail" value={profile.id ? 'Conectado via autenticação' : '-'} />
            <View style={styles.divider} />
            <InfoRow icon={<Phone size={18} color={theme.colors.neutral[400]} />} label="Telefone" value={profile.phone ?? 'Não informado'} />
            <View style={styles.divider} />
            <InfoRow icon={<FileText size={18} color={theme.colors.neutral[400]} />} label="Bio" value={profile.bio ?? 'Nenhuma bio adicionada'} />
            <View style={styles.divider} />
            <InfoRow icon={<Award size={18} color={theme.colors.neutral[400]} />} label="Especialidades" value={profile.specialties?.join(', ') ?? 'Nenhuma especialidade'} />
            <View style={styles.divider} />
            <InfoRow icon={<Instagram size={18} color={theme.colors.neutral[400]} />} label="Instagram" value={profile.instagram ?? 'Não informado'} />
          </View>

          <Button
            title="Editar perfil"
            onPress={() => setEditing(true)}
            variant="outline"
            style={styles.editButton}
          />

          <Button
            title="Sair da conta"
            onPress={handleSignOut}
            variant="danger"
            icon={<LogOut size={18} color={theme.colors.neutral[0]} />}
            style={styles.signOutButton}
          />
        </>
      )}
    </Screen>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      {icon}
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  label: {
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.neutral[400],
    marginBottom: 2,
  },
  value: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.neutral[800],
  },
});

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverHeader: {
    marginBottom: theme.spacing.lg,
  },
  coverBg: {
    height: 80,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.radius.lg,
    marginBottom: -40,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  avatarWrap: {
    position: 'relative',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.neutral[50],
  },
  nameArea: {
    flex: 1,
    paddingBottom: theme.spacing.xs,
  },
  profileName: {
    fontFamily: theme.fonts.heading,
    fontSize: 22,
    color: theme.colors.neutral[900],
  },
  profileRole: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.neutral[100],
    marginVertical: theme.spacing.xs,
  },
  editButton: {
    marginBottom: theme.spacing.sm,
  },
  signOutButton: {
    marginBottom: theme.spacing.xxl,
  },
  formCard: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  fieldGap: {
    marginTop: theme.spacing.md,
  },
  formActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
});
