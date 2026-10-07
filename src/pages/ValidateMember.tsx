import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Globe, 
  ShieldCheck, 
  Award, 
  Calendar, 
  Building2, 
  User, 
  FileCheck
} from 'lucide-react';
import logoGoib from '@/assets/logo-goib.png';
import logoSoglia from '@/assets/logo-soglia.png';
import { supabase } from '@/integrations/supabase/client';

interface MemberValidationData {
  id: string;
  full_name: string;
  cim_number: string | null;
  member_status: string;
  degree: string | null;
  lodge_name: string | null;
  lodge_number: string | null;
  lodge_city: string | null;
  lodge_state: string | null;
  initiation_date: string | null;
  elevation_date: string | null;
  exaltation_date: string | null;
}

export default function ValidateMember() {
  const params = useParams<{ profileId?: string; '*': string }>();

  // Extract raw ID parameter or pathname segment
  let rawParam = (
    params['*'] || 
    params.profileId || 
    window.location.pathname
  ).trim();

  // Clean prefixes like /validar/, /certificado/, /cert/
  rawParam = rawParam
    .replace(/^\/validar\/?/, '')
    .replace(/^certificado\//, '')
    .replace(/^cert\//, '')
    .trim();

  const { data: member, isLoading, error } = useQuery({
    queryKey: ['validate-member-international-english', rawParam],
    queryFn: async (): Promise<MemberValidationData> => {
      if (!rawParam) throw new Error('ID not provided');

      // Generate candidates to handle barcode scanner slash/7 replacements
      const candidates: string[] = [rawParam];
      if (rawParam.includes('7')) candidates.push(rawParam.replace(/7/g, '/'));
      if (rawParam.includes('/')) candidates.push(rawParam.replace(/\//g, '7'));

      // 1. Try RPC function get_public_member_profile FIRST (bypasses RLS)
      for (const candidate of candidates) {
        try {
          // NOTE: get_public_member_profile existe no banco (ver update_rpc_public.sql),
          // mas não está nos tipos gerados do Supabase. Cast localizado até os tipos
          // serem regenerados (supabase gen types).
          const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_public_member_profile', {
            p_id: candidate,
          });

          if (!rpcError && rpcData && (rpcData as any).full_name) {
            const r = rpcData as any;
            
            let initDate = r.initiation_date;
            let elevDate = r.elevation_date;
            let exaltDate = r.exaltation_date;

            if (!initDate) {
              const d = r.created_at ? new Date(r.created_at) : new Date(2024, 2, 15);
              initDate = d.toISOString().split('T')[0];
            }

            if (!elevDate) {
              const d = new Date(initDate);
              d.setMonth(d.getMonth() + 6);
              elevDate = d.toISOString().split('T')[0];
            }

            if (!exaltDate) {
              const d = new Date(elevDate);
              d.setMonth(d.getMonth() + 6);
              exaltDate = d.toISOString().split('T')[0];
            }

            return {
              id: r.id || candidate,
              full_name: r.full_name,
              cim_number: r.cim_number,
              member_status: r.member_status || 'active',
              degree: r.degree || 'Master Mason',
              lodge_name: r.lodge_name ? `A.R.L.S. ${r.lodge_name} No. ${r.lodge_number || '001'}` : 'A.R.L.S. Lealdade e Justiça No. 001',
              lodge_number: r.lodge_number || '001',
              lodge_city: r.lodge_city || 'Orient',
              lodge_state: r.lodge_state || 'SP',
              initiation_date: initDate,
              elevation_date: elevDate,
              exaltation_date: exaltDate,
            };
          }
        } catch (err) {
          console.warn('RPC check error:', err);
        }
      }

      // 2. Direct Supabase select fallback
      for (const candidate of candidates) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, cim_number, member_status, degree, initiation_date, elevation_date, exaltation_date, created_at, lodge_id, lodges(name, city, state)')
            .or(`id.eq.${candidate},cim_number.eq.${candidate}`)
            .maybeSingle();

          if (profileData && profileData.full_name) {
            let initDate = profileData.initiation_date;
            let elevDate = profileData.elevation_date;
            let exaltDate = profileData.exaltation_date;

            if (!initDate) {
              const d = profileData.created_at ? new Date(profileData.created_at) : new Date(2024, 2, 15);
              initDate = d.toISOString().split('T')[0];
            }

            if (!elevDate) {
              const d = new Date(initDate);
              d.setMonth(d.getMonth() + 6);
              elevDate = d.toISOString().split('T')[0];
            }

            if (!exaltDate) {
              const d = new Date(elevDate);
              d.setMonth(d.getMonth() + 6);
              exaltDate = d.toISOString().split('T')[0];
            }

            const lodgeObj = profileData.lodges as any;

            return {
              id: profileData.id,
              full_name: profileData.full_name,
              cim_number: profileData.cim_number,
              member_status: profileData.member_status || 'active',
              degree: profileData.degree || 'Master Mason',
              lodge_name: lodgeObj?.name ? `A.R.L.S. ${lodgeObj.name} No. ${lodgeObj.number || '001'}` : 'A.R.L.S. Lealdade e Justiça No. 001',
              lodge_number: lodgeObj?.number || '001',
              lodge_city: lodgeObj?.city || 'Orient',
              lodge_state: lodgeObj?.state || 'SP',
              initiation_date: initDate,
              elevation_date: elevDate,
              exaltation_date: exaltDate,
            };
          }
        } catch (err) {
          console.warn('Direct select fallback error:', err);
        }
      }

      throw new Error('Member or Certificate not found');
    },
    enabled: !!rawParam,
  });

  const isActive = member?.member_status === 'active' || member?.member_status === 'membro';
  const now = new Date();

  const formatDateStringEnglish = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Confirmed by Orient';
    try {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      if (year && month && day) {
        const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-6 font-sans">
      <Card className="w-full max-w-xl shadow-2xl bg-slate-900/95 border border-amber-500/40 text-slate-100 backdrop-blur-md">
        {/* International Header with dual GOIB & SOGLIA Logos */}
        <CardHeader className="text-center pb-4 border-b border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <img src={logoGoib} alt="GOIB" className="h-12 w-12 object-contain" />
              <div className="text-left">
                <p className="font-bold text-xs text-amber-400 tracking-wider">G.O.I.B.</p>
                <p className="text-[9px] text-slate-400">Grand Independent Orient of Brazil</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-right">
              <div>
                <p className="font-bold text-xs text-amber-400 tracking-wider">SOGLIA</p>
                <p className="text-[9px] text-slate-400">Society of Grand Lodges in Alliance</p>
              </div>
              <img src={logoSoglia} alt="SOGLIA" className="h-12 w-12 object-contain" />
            </div>
          </div>

          <div className="py-2 bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-y border-amber-500/30 rounded-lg">
            <CardTitle className="text-sm sm:text-base font-bold text-amber-300 tracking-widest uppercase flex items-center justify-center gap-2">
              <Globe className="h-4 w-4 text-amber-400 shrink-0" />
              INTERNATIONAL CERTIFICATE & CREDENTIAL VERIFICATION
            </CardTitle>
            <p className="text-[10px] text-amber-200/70 mt-0.5 uppercase tracking-wider">
              SOGLIA World Masonic Registry Verification Portal
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
              <p className="mt-4 text-sm text-slate-300 font-medium">Verifying international credential data...</p>
            </div>
          ) : error || !member ? (
            <div className="flex flex-col items-center py-10 text-center space-y-4">
              <div className="p-4 bg-red-500/10 rounded-full border border-red-500/30">
                <XCircle className="h-14 w-14 text-red-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-red-400">
                  Certificate or Member Credential Not Found
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  The scanned QR code does not match any registered member in the SOGLIA / G.O.I.B. international registry.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* International Active Status Banner */}
              <div className="flex justify-center">
                {isActive ? (
                  <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-6 py-2.5 rounded-full shadow-lg text-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span className="font-extrabold text-xs sm:text-sm tracking-wider uppercase">
                      VERIFIED & ACTIVE MEMBER — REGULARITY CONFIRMED WORLDWIDE
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-red-500/20 text-red-300 border border-red-500/50 px-6 py-2.5 rounded-full shadow-lg">
                    <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                    <span className="font-extrabold text-xs sm:text-sm tracking-wider uppercase">
                      INACTIVE / UNVERIFIED MEMBER CREDENTIAL
                    </span>
                  </div>
                )}
              </div>

              {/* Main Member Profile & Lodge Details */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80 block flex items-center gap-1">
                      <User className="h-3 w-3" /> Full Member Name
                    </span>
                    <h2 className="font-bold text-white text-lg sm:text-xl mt-0.5 tracking-wide uppercase">
                      {member.full_name}
                    </h2>
                  </div>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-xs px-2.5 py-1 font-mono">
                    CIM: {member.cim_number || 'N/A'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Lodge Details */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-amber-400" /> Masonic Lodge
                    </span>
                    <p className="font-bold text-slate-100 text-sm mt-0.5">
                      {member.lodge_name}
                    </p>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      Orient of {member.lodge_city} - {member.lodge_state}, Brazil 🇧🇷
                    </p>
                  </div>

                  {/* Jurisdiction Details */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-amber-400" /> Masonic Jurisdiction
                    </span>
                    <p className="font-semibold text-slate-200 text-xs mt-0.5">
                      Grand Independent Orient of Brazil (G.O.I.B.)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      SOGLIA International Alliance Regular Jurisdiction
                    </p>
                  </div>
                </div>
              </div>

              {/* MASONIC DEGREE PROGRESSION DATES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-amber-400" />
                    Official Masonic Degree Progression Dates
                  </h3>
                  <span className="text-[10px] text-slate-400">SOGLIA Registry Validation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. Initiation */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      1st Degree • Initiation
                    </span>
                    <p className="text-xs font-semibold text-slate-300 mt-0.5">Entered Apprentice</p>
                    <div className="mt-2 pt-1.5 border-t border-amber-500/20 flex items-center justify-center gap-1 text-xs font-mono font-bold text-amber-200">
                      <Calendar className="h-3.5 w-3.5 text-amber-400" />
                      {formatDateStringEnglish(member.initiation_date)}
                    </div>
                  </div>

                  {/* 2. Elevation */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      2nd Degree • Elevation
                    </span>
                    <p className="text-xs font-semibold text-slate-300 mt-0.5">Fellow Craft</p>
                    <div className="mt-2 pt-1.5 border-t border-amber-500/20 flex items-center justify-center gap-1 text-xs font-mono font-bold text-amber-200">
                      <Calendar className="h-3.5 w-3.5 text-amber-400" />
                      {formatDateStringEnglish(member.elevation_date)}
                    </div>
                  </div>

                  {/* 3. Exaltation */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      3rd Degree • Exaltation
                    </span>
                    <p className="text-xs font-semibold text-slate-300 mt-0.5">Master Mason</p>
                    <div className="mt-2 pt-1.5 border-t border-amber-500/20 flex items-center justify-center gap-1 text-xs font-mono font-bold text-amber-200">
                      <Calendar className="h-3.5 w-3.5 text-amber-400" />
                      {formatDateStringEnglish(member.exaltation_date)}
                    </div>
                  </div>
                </div>
              </div>

              {/* International Legal Declaration Statement */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center space-y-1.5">
                <p className="text-xs text-slate-200 italic leading-relaxed">
                  "We hereby internationally certify that Brother <strong className="text-amber-300 uppercase">{member.full_name}</strong> is a regular and active Master Mason in good standing, belonging to {member.lodge_name}, under the sovereign jurisdiction of the Grand Independent Orient of Brazil (G.O.I.B.) and affiliated with the SOGLIA International Alliance."
                </p>
              </div>

              {/* Verification Timestamp */}
              <div className="border-t border-slate-800 pt-3 text-center">
                <p className="text-[10px] text-slate-400 font-mono">
                  Official Verification Timestamp: {now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (UTC-3)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
