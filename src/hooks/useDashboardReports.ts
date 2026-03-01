import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LodgeMemberCount {
  lodge_name: string;
  count: number;
}

interface RegionCount {
  region: string;
  count: number;
}

interface AgeGroup {
  range: string;
  count: number;
}

interface PaymentStats {
  paid: number;
  pending: number;
  overdue: number;
  total_amount: number;
  paid_amount: number;
}

interface PositionCount {
  position: string;
  count: number;
}

interface MonthlyGrowth {
  month: string;
  count: number;
}

export function useDashboardReports() {
  return useQuery({
    queryKey: ['dashboard-reports'],
    queryFn: async () => {
      // 1. Lodges x Member count
      const { data: profiles } = await supabase
        .from('profiles')
        .select('lodge_id, birth_date, city, state, degree, member_status, lodge_position, civil_status, created_at')
        .in('status', ['approved', 'membro']);

      const { data: lodges } = await supabase
        .from('lodges')
        .select('id, name');

      const lodgeMap = new Map(lodges?.map(l => [l.id, l.name]) || []);

      // Lodge x members
      const lodgeCounts: Record<string, number> = {};
      profiles?.forEach(p => {
        if (p.lodge_id) {
          const name = lodgeMap.get(p.lodge_id) || 'Sem Loja';
          lodgeCounts[name] = (lodgeCounts[name] || 0) + 1;
        }
      });
      const lodgeMembers: LodgeMemberCount[] = Object.entries(lodgeCounts)
        .map(([lodge_name, count]) => ({ lodge_name, count }))
        .sort((a, b) => b.count - a.count);

      // 2. Regions (state)
      const stateCounts: Record<string, number> = {};
      profiles?.forEach(p => {
        const state = p.state || 'Não informado';
        stateCounts[state] = (stateCounts[state] || 0) + 1;
      });
      const regionsByState: RegionCount[] = Object.entries(stateCounts)
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count);

      // 3. Regions (city)
      const cityCounts: Record<string, number> = {};
      profiles?.forEach(p => {
        const city = p.city || 'Não informado';
        cityCounts[city] = (cityCounts[city] || 0) + 1;
      });
      const regionsByCity: RegionCount[] = Object.entries(cityCounts)
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      // 4. Average age + age distribution
      const now = new Date();
      const ages: number[] = [];
      profiles?.forEach(p => {
        if (p.birth_date) {
          const birth = new Date(p.birth_date);
          const age = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          if (age > 0 && age < 120) ages.push(age);
        }
      });
      const averageAge = ages.length > 0 ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : 0;

      const ageGroups: AgeGroup[] = [
        { range: '18-25', count: 0 },
        { range: '26-35', count: 0 },
        { range: '36-45', count: 0 },
        { range: '46-55', count: 0 },
        { range: '56-65', count: 0 },
        { range: '65+', count: 0 },
      ];
      ages.forEach(age => {
        if (age <= 25) ageGroups[0].count++;
        else if (age <= 35) ageGroups[1].count++;
        else if (age <= 45) ageGroups[2].count++;
        else if (age <= 55) ageGroups[3].count++;
        else if (age <= 65) ageGroups[4].count++;
        else ageGroups[5].count++;
      });

      // 5. Degree distribution
      const degreeCounts: Record<string, number> = {};
      profiles?.forEach(p => {
        const degree = p.degree || 'Aprendiz';
        degreeCounts[degree] = (degreeCounts[degree] || 0) + 1;
      });

      // 6. Member status (active/inactive/etc)
      const statusCounts: Record<string, number> = {};
      profiles?.forEach(p => {
        const st = p.member_status || 'active';
        statusCounts[st] = (statusCounts[st] || 0) + 1;
      });

      // 7. Civil status distribution
      const civilCounts: Record<string, number> = {};
      profiles?.forEach(p => {
        const cs = p.civil_status || 'Não informado';
        civilCounts[cs] = (civilCounts[cs] || 0) + 1;
      });

      // 8. Lodge positions
      const positionCounts: Record<string, number> = {};
      profiles?.forEach(p => {
        if (p.lodge_position) {
          positionCounts[p.lodge_position] = (positionCounts[p.lodge_position] || 0) + 1;
        }
      });
      const positions: PositionCount[] = Object.entries(positionCounts)
        .map(([position, count]) => ({ position, count }))
        .sort((a, b) => b.count - a.count);

      // 9. Financial stats (current month)
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const { data: payments } = await supabase
        .from('monthly_payments')
        .select('status, amount')
        .eq('reference_month', currentMonth)
        .eq('reference_year', currentYear);

      const paymentStats: PaymentStats = {
        paid: 0,
        pending: 0,
        overdue: 0,
        total_amount: 0,
        paid_amount: 0,
      };
      payments?.forEach(p => {
        paymentStats.total_amount += Number(p.amount);
        if (p.status === 'paid') {
          paymentStats.paid++;
          paymentStats.paid_amount += Number(p.amount);
        } else if (p.status === 'overdue') {
          paymentStats.overdue++;
        } else {
          paymentStats.pending++;
        }
      });

      // 10. Growth (members by creation month, last 12 months)
      const monthlyGrowth: MonthlyGrowth[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        const count = profiles?.filter(p => {
          const created = new Date(p.created_at);
          return created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear();
        }).length || 0;
        monthlyGrowth.push({ month: label, count });
      }

      return {
        lodgeMembers,
        regionsByState,
        regionsByCity,
        averageAge,
        ageGroups,
        degreeCounts,
        statusCounts,
        civilCounts,
        positions,
        paymentStats,
        monthlyGrowth,
        totalMembers: profiles?.length || 0,
      };
    },
  });
}
