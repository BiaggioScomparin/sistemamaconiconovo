import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, Globe, ShieldCheck, Award } from 'lucide-react';
import logoGoib from '@/assets/logo-goib.png';
import logoSoglia from '@/assets/logo-soglia.png';
import { supabase } from '@/integrations/supabase/client';

interface MemberData {
  full_name: string;
  cim_number: string | null;
  member_status: string;
  lodge_name: string | null;
  lodge_city: string | null;
  lodge_state: string | null;
}

export default function ValidateMember() {
  const params = useParams<{ profileId?: string; '*': string }>();

  // Extract raw ID parameter or pathname segment
  const rawParam = (
    params['*'] || 
    params.profileId || 
    window.location.pathname.replace(/^\/validar\/?/, '')
  ).trim();

  const { data: member, isLoading, error } = useQuery({
    queryKey: ['validate-member', rawParam],
    queryFn: async (): Promise<MemberData> => {
      if (!rawParam) throw new Error('ID not provided');

      // Generate candidates to handle hardware barcode scanner keyboard layout issues
      const candidates: string[] = [];
      candidates.push(rawParam);

      const replaced7 = rawParam.replace(/\//g, '7');
      if (replaced7 !== rawParam) candidates.push(replaced7);

      const removedSlashes = rawParam.replace(/\//g, '');
      if (removedSlashes !== rawParam && removedSlashes !== replaced7) {
        candidates.push(removedSlashes);
      }

      // Try RPC function for each candidate
      for (const candidate of candidates) {
        try {
          const { data, error: rpcError } = await supabase.rpc('get_public_member_profile', {
            p_id: candidate,
          });

          if (!rpcError && data && (data as any).full_name) {
            return data as MemberData;
          }
        } catch (err) {
          console.warn('RPC check error:', err);
        }
      }

      // Fallback: Edge function call
      for (const candidate of candidates) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-member?id=${encodeURIComponent(candidate)}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.ok) {
            return await response.json();
          }
        } catch (err) {
          console.warn('Edge function check error:', err);
        }
      }

      throw new Error('Member not found');
    },
    enabled: !!rawParam,
  });

  const isActive = member?.member_status === 'active';
  const now = new Date();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl bg-slate-900 border border-amber-500/40 text-slate-100">
        {/* Header with dual GOIB & SOGLIA Logos */}
        <CardHeader className="text-center pb-3 border-b border-amber-500/20">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="flex items-center gap-2">
              <img src={logoGoib} alt="GOIB" className="h-12 w-12 object-contain" />
              <div className="text-left">
                <p className="font-display text-xs font-bold text-amber-400">G.O.I.B.</p>
                <p className="text-[9px] text-slate-400">Grand Independent Orient of Brazil</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-right">
              <div>
                <p className="font-display text-xs font-bold text-amber-400">SOGLIA</p>
                <p className="text-[9px] text-slate-400">Society of Grand Lodges in Alliance</p>
              </div>
              <img src={logoSoglia} alt="SOGLIA" className="h-12 w-12 object-contain" />
            </div>
          </div>

          <div className="py-1 bg-amber-500/10 border-y border-amber-500/20 rounded mt-2">
            <CardTitle className="font-display text-base text-amber-300 tracking-wider uppercase flex items-center justify-center gap-2">
              <Globe className="h-4 w-4 text-amber-400" />
              Official Masonic Credential Verification
            </CardTitle>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            SOGLIA International Alliance Verification Portal
          </p>
        </CardHeader>

        <CardContent className="pt-5 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
              <p className="mt-4 text-sm text-slate-300 font-medium">Verifying international credential...</p>
            </div>
          ) : error || !member ? (
            <div className="flex flex-col items-center py-8 text-center space-y-3">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/30">
                <XCircle className="h-14 w-14 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-red-400">
                Member Credential Not Found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                The scanned QR code or registration ID does not match any active Masonic member in the SOGLIA / G.O.I.B. international registry.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* International Status Banner */}
              <div className="flex justify-center">
                {isActive ? (
                  <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-6 py-2.5 rounded-full shadow-lg">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="font-bold text-sm tracking-wide uppercase">ACTIVE MEMBER — VALID WORLDWIDE</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-red-500/20 text-red-300 border border-red-500/40 px-6 py-2.5 rounded-full shadow-lg">
                    <XCircle className="h-5 w-5 text-red-400" />
                    <span className="font-bold text-sm tracking-wide uppercase">INACTIVE MEMBER</span>
                  </div>
                )}
              </div>

              {/* Member Details in English */}
              <div className="space-y-3.5 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <div>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 block">Full Name</span>
                  <p className="font-bold text-white text-base mt-0.5 border-b border-slate-800 pb-1">
                    {member.full_name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 block">Registration No. (CIM)</span>
                    <p className="font-mono font-bold text-amber-400 text-sm mt-0.5">
                      {member.cim_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 block">Country of Residence</span>
                    <p className="font-semibold text-slate-200 text-sm mt-0.5">
                      Brazil 🇧🇷
                    </p>
                  </div>
                </div>

                {member.lodge_name && (
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 block">Masonic Lodge</span>
                    <p className="font-semibold text-slate-100 text-sm mt-0.5">
                      {member.lodge_name}
                    </p>
                  </div>
                )}

                {member.lodge_city && (
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 block">Orient (City)</span>
                    <p className="font-semibold text-amber-300 text-sm mt-0.5">
                      {member.lodge_city}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 block">Masonic Jurisdiction</span>
                  <p className="font-semibold text-slate-300 text-xs mt-0.5">
                    Grand Independent Orient of Brazil (G.O.I.B.) / SOGLIA International Alliance
                  </p>
                </div>
              </div>

              {/* Official Declaration Statement */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-center">
                <p className="text-xs text-slate-300 italic leading-relaxed">
                  "This confirmation certifies that the brother identified above is a regular Master Mason in good standing under the jurisdiction of the Grand Independent Orient of Brazil (G.O.I.B.), a sovereign member of SOGLIA (Society of Grand Lodges in Alliance)."
                </p>
              </div>

              {/* Verification Timestamp */}
              <div className="border-t border-slate-800 pt-3 text-center">
                <p className="text-[10px] text-slate-400">
                  Official Verification Timestamp: {now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
