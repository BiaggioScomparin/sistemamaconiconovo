import { format } from 'date-fns';
import { isChanceler, isVeneravelMestre } from '@/lib/roleUtils';

export interface AttendanceTimeCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates whether a member is allowed to confirm attendance for a given session.
 * 
 * Rules:
 * 1. Chanceler, Venerável Mestre or System Admins are exempt ("O chanceler continua a mesma regra").
 * 2. Regular members can ONLY confirm attendance on the day of the session (sessionDate === today).
 * 3. Regular members can ONLY confirm attendance up to 1 hour before the session start time.
 */
export function canMemberConfirmAttendance(
  sessionDate: string, // format: YYYY-MM-DD
  sessionTime?: string | null, // format: HH:mm or HH:mm:ss
  userPosition?: string | null,
  isAdmin: boolean = false
): AttendanceTimeCheck {
  // Exemption check: Chanceler, Venerável Mestre, or Admin
  if (isAdmin || isChanceler(userPosition) || isVeneravelMestre(userPosition)) {
    return { allowed: true };
  }

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  // Rule 1: Must be on the day of the session
  if (sessionDate !== todayStr) {
    if (sessionDate < todayStr) {
      return {
        allowed: false,
        reason: 'A confirmação de presença só é permitida no dia da sessão. Esta sessão já encerrou.',
      };
    } else {
      return {
        allowed: false,
        reason: 'A confirmação de presença só pode ser realizada no próprio dia da sessão.',
      };
    }
  }

  // Rule 2: Up to 1 hour before session start time
  // Default session time if not provided: 20:00 (8:00 PM)
  const timeStr = sessionTime || '20:00';
  const timeParts = timeStr.split(':');
  const hours = parseInt(timeParts[0], 10) || 20;
  const minutes = parseInt(timeParts[1], 10) || 0;

  // Construct session start Date for today
  const sessionDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

  // Cutoff is 1 hour before start time
  const cutoffTime = new Date(sessionDateTime.getTime() - 60 * 60 * 1000);

  if (now > cutoffTime) {
    const formattedCutoff = format(cutoffTime, 'HH:mm');
    const formattedSession = format(sessionDateTime, 'HH:mm');
    return {
      allowed: false,
      reason: `A confirmação de presença encerrrou às ${formattedCutoff} (1 hora antes do início às ${formattedSession}).`,
    };
  }

  return { allowed: true };
}
