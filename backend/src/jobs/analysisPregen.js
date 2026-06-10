import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const claude   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TEAM_DATA = {
  MEX: { name:'Mexico',            flag:'🇲🇽', fifaRank:15, heat:89, pitch:61, altitude:100, travel:80,  crowd:78,  schedule:49,  insight:'Home comforts dominate — unmatched altitude and heat resilience.' },
  RSA: { name:'South Africa',      flag:'🇿🇦', fifaRank:61, heat:84, pitch:22, altitude:71,  travel:50,  crowd:38,  schedule:29,  insight:'Strong heat tolerance from PSL conditions.' },
  KOR: { name:'South Korea',       flag:'🇰🇷', fifaRank:22, heat:47, pitch:74, altitude:28,  travel:18,  crowd:69,  schedule:94,  insight:'K-League discipline shines in schedule management.' },
  CZE: { name:'Czechia',           flag:'🇨🇿', fifaRank:44, heat:23, pitch:79, altitude:22,  travel:55,  crowd:26,  schedule:55,  insight:'European pitch comfort but struggles with NA heat.' },
  CAN: { name:'Canada',            flag:'🇨🇦', fifaRank:27, heat:16, pitch:53, altitude:33,  travel:85,  crowd:16,  schedule:43,  insight:'Host advantage on travel.' },
  BIH: { name:'Bosnia-Herzegovina',flag:'🇧🇦', fifaRank:71, heat:41, pitch:48, altitude:45,  travel:60,  crowd:44,  schedule:32,  insight:'Heaviest group-stage travel burden in the field.' },
  QAT: { name:'Qatar',             flag:'🇶🇦', fifaRank:51, heat:100,pitch:69, altitude:22,  travel:70,  crowd:1,   schedule:21,  insight:'Highest heat score. Crowd atmosphere unfamiliar away.' },
  SUI: { name:'Switzerland',       flag:'🇨🇭', fifaRank:17, heat:34, pitch:84, altitude:79,  travel:75,  crowd:32,  schedule:72,  insight:'Uniquely altitude-resistant. Deep squad.' },
  BRA: { name:'Brazil',            flag:'🇧🇷', fifaRank:5,  heat:96, pitch:53, altitude:75,  travel:75,  crowd:94,  schedule:60,  insight:'Elite heat and crowd resilience.' },
  MAR: { name:'Morocco',           flag:'🇲🇦', fifaRank:11, heat:82, pitch:43, altitude:64,  travel:60,  crowd:63,  schedule:43,  insight:'2022 semi-finalists. North African heat asset.' },
  HAI: { name:'Haiti',             flag:'🇭🇹', fifaRank:84, heat:87, pitch:1,  altitude:28,  travel:36,  crowd:26,  schedule:1,   insight:'Caribbean heat resilience. Pitch concerns.' },
  SCO: { name:'Scotland',          flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', fifaRank:36, heat:1,  pitch:79, altitude:1,   travel:60,  crowd:57,  schedule:49,  insight:'Heat is the biggest threat.' },
  USA: { name:'USA',               flag:'🇺🇸', fifaRank:13, heat:60, pitch:74, altitude:49,  travel:100, crowd:63,  schedule:77,  insight:'Host advantage massive on travel.' },
  PAR: { name:'Paraguay',          flag:'🇵🇾', fifaRank:61, heat:84, pitch:27, altitude:66,  travel:55,  crowd:38,  schedule:26,  insight:'SA heat experience. Thin squad depth.' },
  AUS: { name:'Australia',         flag:'🇦🇺', fifaRank:24, heat:71, pitch:58, altitude:37,  travel:26,  crowd:32,  schedule:55,  insight:'Worst travel burden among non-Asian sides.' },
  TUR: { name:'Türkiye',           flag:'🇹🇷', fifaRank:26, heat:63, pitch:64, altitude:49,  travel:60,  crowd:63,  schedule:60,  insight:'Mediterranean heat competence.' },
  GER: { name:'Germany',           flag:'🇩🇪', fifaRank:12, heat:30, pitch:100,altitude:28,  travel:65,  crowd:69,  schedule:100, insight:'Elite squad rotation. Heat is a risk.' },
  CUW: { name:'Curaçao',           flag:'🇨🇼', fifaRank:82, heat:93, pitch:17, altitude:16,  travel:46,  crowd:7,   schedule:9,   insight:'Caribbean heat resilience is genuine.' },
  CIV: { name:"Côte d'Ivoire",     flag:'🇨🇮', fifaRank:15, heat:89, pitch:27, altitude:49,  travel:55,  crowd:50,  schedule:26,  insight:'West African heat specialists.' },
  ECU: { name:'Ecuador',           flag:'🇪🇨', fifaRank:33, heat:71, pitch:35, altitude:92,  travel:60,  crowd:32,  schedule:38,  insight:'Altitude is their superpower.' },
  NED: { name:'Netherlands',       flag:'🇳🇱', fifaRank:7,  heat:23, pitch:100,altitude:16,  travel:70,  crowd:57,  schedule:89,  insight:'Elite pitch comfort. Deep squad.' },
  JPN: { name:'Japan',             flag:'🇯🇵', fifaRank:18, heat:67, pitch:95, altitude:33,  travel:11,  crowd:78,  schedule:100, insight:'Exceptional discipline. Tough travel.' },
  SWE: { name:'Sweden',            flag:'🇸🇪', fifaRank:25, heat:12, pitch:84, altitude:16,  travel:65,  crowd:38,  schedule:72,  insight:'Heat is the standout risk.' },
  TUN: { name:'Tunisia',           flag:'🇹🇳', fifaRank:34, heat:78, pitch:35, altitude:33,  travel:50,  crowd:32,  schedule:26,  insight:'North African heat resilience.' },
  BEL: { name:'Belgium',           flag:'🇧🇪', fifaRank:8,  heat:19, pitch:95, altitude:16,  travel:65,  crowd:63,  schedule:83,  insight:'Deep European pedigree.' },
  EGY: { name:'Egypt',             flag:'🇪🇬', fifaRank:43, heat:85, pitch:37, altitude:37,  travel:55,  crowd:69,  schedule:38,  insight:'Salah influence enormous.' },
  IRN: { name:'Iran',              flag:'🇮🇷', fifaRank:22, heat:74, pitch:37, altitude:58,  travel:50,  crowd:50,  schedule:32,  insight:'Persepolis-standard heat.' },
  NZL: { name:'New Zealand',       flag:'🇳🇿', fifaRank:96, heat:41, pitch:48, altitude:28,  travel:1,   crowd:1,   schedule:38,  insight:'Worst travel score in the field.' },
  ESP: { name:'Spain',             flag:'🇪🇸', fifaRank:1,  heat:60, pitch:100,altitude:43,  travel:70,  crowd:88,  schedule:100, insight:'World champions. Two games under Atlanta roof.' },
  CPV: { name:'Cabo Verde',        flag:'🇨🇻', fifaRank:75, heat:89, pitch:9,  altitude:37,  travel:41,  crowd:26,  schedule:9,   insight:'Atlantic island heat specialists.' },
  KSA: { name:'Saudi Arabia',      flag:'🇸🇦', fifaRank:56, heat:93, pitch:53, altitude:33,  travel:60,  crowd:26,  schedule:26,  insight:'Genuine heat tolerance.' },
  URU: { name:'Uruguay',           flag:'🇺🇾', fifaRank:16, heat:56, pitch:58, altitude:58,  travel:65,  crowd:57,  schedule:49,  insight:'One of the oldest squads in the tournament.' },
  FRA: { name:'France',            flag:'🇫🇷', fifaRank:3,  heat:45, pitch:95, altitude:28,  travel:70,  crowd:81,  schedule:94,  insight:'Elite depth. Northeast corridor group.' },
  SEN: { name:'Senegal',           flag:'🇸🇳', fifaRank:20, heat:85, pitch:27, altitude:45,  travel:46,  crowd:50,  schedule:26,  insight:'AFCON-hardened heat specialists.' },
  IRQ: { name:'Iraq',              flag:'🇮🇶', fifaRank:63, heat:96, pitch:22, altitude:37,  travel:46,  crowd:38,  schedule:15,  insight:'Most heat-adapted squad in the field.' },
  NOR: { name:'Norway',            flag:'🇳🇴', fifaRank:28, heat:8,  pitch:69, altitude:12,  travel:60,  crowd:32,  schedule:66,  insight:"Haaland's Norway. Heat is the concern." },
  ARG: { name:'Argentina',         flag:'🇦🇷', fifaRank:2,  heat:63, pitch:64, altitude:75,  travel:65,  crowd:100, schedule:66,  insight:'Softest draw. Dallas AC, short hops.' },
  ALG: { name:'Algeria',           flag:'🇩🇿', fifaRank:40, heat:82, pitch:32, altitude:54,  travel:55,  crowd:44,  schedule:26,  insight:'2nd hardest burden. Underreported.' },
  AUT: { name:'Austria',           flag:'🇦🇹', fifaRank:27, heat:27, pitch:84, altitude:43,  travel:60,  crowd:32,  schedule:60,  insight:'Bundesliga-level pitch comfort.' },
  JOR: { name:'Jordan',            flag:'🇯🇴', fifaRank:71, heat:85, pitch:27, altitude:49,  travel:50,  crowd:26,  schedule:15,  insight:'First World Cup. Good heat prep.' },
  POR: { name:'Portugal',          flag:'🇵🇹', fifaRank:6,  heat:60, pitch:84, altitude:37,  travel:65,  crowd:81,  schedule:89,  insight:'Ronaldo final chapter.' },
  COD: { name:'Congo DR',          flag:'🇨🇩', fifaRank:55, heat:85, pitch:9,  altitude:54,  travel:31,  crowd:26,  schedule:9,   insight:'Equatorial heat specialists.' },
  UZB: { name:'Uzbekistan',        flag:'🇺🇿', fifaRank:50, heat:74, pitch:43, altitude:62,  travel:36,  crowd:13,  schedule:26,  insight:'Surprise qualifiers. Real resilience.' },
  COL: { name:'Colombia',          flag:'🇨🇴', fifaRank:13, heat:78, pitch:43, altitude:79,  travel:60,  crowd:63,  schedule:43,  insight:'Elite altitude conditioning.' },
  ENG: { name:'England',           flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', fifaRank:4,  heat:19, pitch:95, altitude:12,  travel:65,  crowd:75,  schedule:94,  insight:'Worst burden among top favorites.' },
  CRO: { name:'Croatia',           flag:'🇭🇷', fifaRank:10, heat:52, pitch:74, altitude:37,  travel:60,  crowd:63,  schedule:66,  insight:'Veteran know-how. Aging squad.' },
  GHA: { name:'Ghana',             flag:'🇬🇭', fifaRank:57, heat:85, pitch:27, altitude:45,  travel:50,  crowd:50,  schedule:26,  insight:'West African heat specialists.' },
  PAN: { name:'Panama',            flag:'🇵🇦', fifaRank:49, heat:89, pitch:17, altitude:37,  travel:60,  crowd:32,  schedule:15,  insight:'Panama City humidity is elite prep.' },
}

const FIXTURES = [
  // GROUP A
  { id:'A1', group:'A', home:'MEX', away:'RSA', venue:'Estadio Azteca',         city:'Mexico City',  date:'2026-06-11', roofed:false, altitude:2240 },
  { id:'A2', group:'A', home:'KOR', away:'CZE', venue:'Estadio Akron',          city:'Guadalajara',  date:'2026-06-11', roofed:false, altitude:1566 },
  { id:'A3', group:'A', home:'CZE', away:'RSA', venue:'Mercedes-Benz Stadium',  city:'Atlanta',      date:'2026-06-18', roofed:true,  altitude:287  },
  { id:'A4', group:'A', home:'MEX', away:'KOR', venue:'Estadio Akron',          city:'Guadalajara',  date:'2026-06-18', roofed:false, altitude:1566 },
  { id:'A5', group:'A', home:'CZE', away:'MEX', venue:'Estadio Azteca',         city:'Mexico City',  date:'2026-06-24', roofed:false, altitude:2240 },
  { id:'A6', group:'A', home:'RSA', away:'KOR', venue:'Estadio BBVA',           city:'Monterrey',    date:'2026-06-24', roofed:false, altitude:537  },
  // GROUP B
  { id:'B1', group:'B', home:'CAN', away:'BIH', venue:'BMO Field',              city:'Toronto',      date:'2026-06-12', roofed:false, altitude:76   },
  { id:'B2', group:'B', home:'QAT', away:'SUI', venue:"Levi's Stadium",         city:'Santa Clara',  date:'2026-06-13', roofed:false, altitude:18   },
  { id:'B3', group:'B', home:'SUI', away:'BIH', venue:'SoFi Stadium',           city:'Los Angeles',  date:'2026-06-18', roofed:true,  altitude:89   },
  { id:'B4', group:'B', home:'CAN', away:'QAT', venue:'BC Place',               city:'Vancouver',    date:'2026-06-18', roofed:true,  altitude:5    },
  { id:'B5', group:'B', home:'SUI', away:'CAN', venue:'BC Place',               city:'Vancouver',    date:'2026-06-24', roofed:true,  altitude:5    },
  { id:'B6', group:'B', home:'BIH', away:'QAT', venue:'Lumen Field',            city:'Seattle',      date:'2026-06-24', roofed:false, altitude:4    },
  // GROUP C
  { id:'C1', group:'C', home:'BRA', away:'MAR', venue:'MetLife Stadium',        city:'New York',     date:'2026-06-13', roofed:false, altitude:2    },
  { id:'C2', group:'C', home:'HAI', away:'SCO', venue:'Gillette Stadium',       city:'Boston',       date:'2026-06-13', roofed:false, altitude:24   },
  { id:'C3', group:'C', home:'SCO', away:'MAR', venue:'Gillette Stadium',       city:'Boston',       date:'2026-06-19', roofed:false, altitude:24   },
  { id:'C4', group:'C', home:'BRA', away:'HAI', venue:'Lincoln Financial Field',city:'Philadelphia', date:'2026-06-19', roofed:false, altitude:11   },
  { id:'C5', group:'C', home:'MAR', away:'HAI', venue:'Mercedes-Benz Stadium',  city:'Atlanta',      date:'2026-06-24', roofed:true,  altitude:287  },
  { id:'C6', group:'C', home:'SCO', away:'BRA', venue:'Hard Rock Stadium',      city:'Miami',        date:'2026-06-24', roofed:false, altitude:2    },
  // GROUP D
  { id:'D1', group:'D', home:'USA', away:'PAR', venue:'SoFi Stadium',           city:'Los Angeles',  date:'2026-06-12', roofed:true,  altitude:89   },
  { id:'D2', group:'D', home:'AUS', away:'TUR', venue:'BC Place',               city:'Vancouver',    date:'2026-06-13', roofed:true,  altitude:5    },
  { id:'D3', group:'D', home:'USA', away:'AUS', venue:'Lumen Field',            city:'Seattle',      date:'2026-06-19', roofed:false, altitude:4    },
  { id:'D4', group:'D', home:'TUR', away:'PAR', venue:"Levi's Stadium",         city:'Santa Clara',  date:'2026-06-19', roofed:false, altitude:18   },
  { id:'D5', group:'D', home:'TUR', away:'USA', venue:'SoFi Stadium',           city:'Los Angeles',  date:'2026-06-25', roofed:true,  altitude:89   },
  { id:'D6', group:'D', home:'PAR', away:'AUS', venue:"Levi's Stadium",         city:'Santa Clara',  date:'2026-06-25', roofed:false, altitude:18   },
  // GROUP E
  { id:'E1', group:'E', home:'GER', away:'CUW', venue:'NRG Stadium',            city:'Houston',      date:'2026-06-14', roofed:true,  altitude:35   },
  { id:'E2', group:'E', home:'CIV', away:'ECU', venue:'Lincoln Financial Field',city:'Philadelphia', date:'2026-06-14', roofed:false, altitude:11   },
  { id:'E3', group:'E', home:'GER', away:'CIV', venue:'BMO Field',              city:'Toronto',      date:'2026-06-20', roofed:false, altitude:76   },
  { id:'E4', group:'E', home:'ECU', away:'CUW', venue:'Arrowhead Stadium',      city:'Kansas City',  date:'2026-06-20', roofed:false, altitude:290  },
  { id:'E5', group:'E', home:'ECU', away:'GER', venue:'MetLife Stadium',        city:'New York',     date:'2026-06-25', roofed:false, altitude:2    },
  { id:'E6', group:'E', home:'CUW', away:'CIV', venue:'Lincoln Financial Field',city:'Philadelphia', date:'2026-06-25', roofed:false, altitude:11   },
  // GROUP F
  { id:'F1', group:'F', home:'NED', away:'JPN', venue:'AT&T Stadium',           city:'Dallas',       date:'2026-06-14', roofed:true,  altitude:186  },
  { id:'F2', group:'F', home:'SWE', away:'TUN', venue:'Estadio BBVA',           city:'Monterrey',    date:'2026-06-14', roofed:false, altitude:537  },
  { id:'F3', group:'F', home:'NED', away:'SWE', venue:'NRG Stadium',            city:'Houston',      date:'2026-06-20', roofed:true,  altitude:35   },
  { id:'F4', group:'F', home:'TUN', away:'JPN', venue:'Estadio BBVA',           city:'Monterrey',    date:'2026-06-20', roofed:false, altitude:537  },
  { id:'F5', group:'F', home:'JPN', away:'SWE', venue:'AT&T Stadium',           city:'Dallas',       date:'2026-06-25', roofed:true,  altitude:186  },
  { id:'F6', group:'F', home:'TUN', away:'NED', venue:'Arrowhead Stadium',      city:'Kansas City',  date:'2026-06-25', roofed:false, altitude:290  },
  // GROUP G
  { id:'G1', group:'G', home:'BEL', away:'EGY', venue:'Lumen Field',            city:'Seattle',      date:'2026-06-15', roofed:false, altitude:4    },
  { id:'G2', group:'G', home:'IRN', away:'NZL', venue:'SoFi Stadium',           city:'Los Angeles',  date:'2026-06-15', roofed:true,  altitude:89   },
  { id:'G3', group:'G', home:'BEL', away:'IRN', venue:'SoFi Stadium',           city:'Los Angeles',  date:'2026-06-21', roofed:true,  altitude:89   },
  { id:'G4', group:'G', home:'NZL', away:'EGY', venue:'BC Place',               city:'Vancouver',    date:'2026-06-21', roofed:true,  altitude:5    },
  { id:'G5', group:'G', home:'EGY', away:'IRN', venue:'Lumen Field',            city:'Seattle',      date:'2026-06-26', roofed:false, altitude:4    },
  { id:'G6', group:'G', home:'NZL', away:'BEL', venue:'BC Place',               city:'Vancouver',    date:'2026-06-26', roofed:true,  altitude:5    },
  // GROUP H
  { id:'H1', group:'H', home:'ESP', away:'CPV', venue:'Mercedes-Benz Stadium',  city:'Atlanta',      date:'2026-06-15', roofed:true,  altitude:287  },
  { id:'H2', group:'H', home:'KSA', away:'URU', venue:'Hard Rock Stadium',      city:'Miami',        date:'2026-06-15', roofed:false, altitude:2    },
  { id:'H3', group:'H', home:'ESP', away:'KSA', venue:'Mercedes-Benz Stadium',  city:'Atlanta',      date:'2026-06-21', roofed:true,  altitude:287  },
  { id:'H4', group:'H', home:'URU', away:'CPV', venue:'Hard Rock Stadium',      city:'Miami',        date:'2026-06-21', roofed:false, altitude:2    },
  { id:'H5', group:'H', home:'URU', away:'ESP', venue:'Estadio Akron',          city:'Guadalajara',  date:'2026-06-26', roofed:false, altitude:1566 },
  { id:'H6', group:'H', home:'CPV', away:'KSA', venue:'NRG Stadium',            city:'Houston',      date:'2026-06-26', roofed:true,  altitude:35   },
  // GROUP I
  { id:'I1', group:'I', home:'FRA', away:'SEN', venue:'MetLife Stadium',        city:'New York',     date:'2026-06-16', roofed:false, altitude:2    },
  { id:'I2', group:'I', home:'IRQ', away:'NOR', venue:'Gillette Stadium',       city:'Boston',       date:'2026-06-16', roofed:false, altitude:24   },
  { id:'I3', group:'I', home:'FRA', away:'IRQ', venue:'Lincoln Financial Field',city:'Philadelphia', date:'2026-06-22', roofed:false, altitude:11   },
  { id:'I4', group:'I', home:'NOR', away:'SEN', venue:'MetLife Stadium',        city:'New York',     date:'2026-06-22', roofed:false, altitude:2    },
  { id:'I5', group:'I', home:'SEN', away:'IRQ', venue:'BMO Field',              city:'Toronto',      date:'2026-06-26', roofed:false, altitude:76   },
  { id:'I6', group:'I', home:'NOR', away:'FRA', venue:'Gillette Stadium',       city:'Boston',       date:'2026-06-26', roofed:false, altitude:24   },
  // GROUP J
  { id:'J1', group:'J', home:'ARG', away:'ALG', venue:'Arrowhead Stadium',      city:'Kansas City',  date:'2026-06-16', roofed:false, altitude:290  },
  { id:'J2', group:'J', home:'AUT', away:'JOR', venue:"Levi's Stadium",         city:'Santa Clara',  date:'2026-06-16', roofed:false, altitude:18   },
  { id:'J3', group:'J', home:'ARG', away:'AUT', venue:'AT&T Stadium',           city:'Dallas',       date:'2026-06-22', roofed:true,  altitude:186  },
  { id:'J4', group:'J', home:'JOR', away:'ALG', venue:"Levi's Stadium",         city:'Santa Clara',  date:'2026-06-22', roofed:false, altitude:18   },
  { id:'J5', group:'J', home:'ALG', away:'AUT', venue:'Arrowhead Stadium',      city:'Kansas City',  date:'2026-06-27', roofed:false, altitude:290  },
  { id:'J6', group:'J', home:'JOR', away:'ARG', venue:'AT&T Stadium',           city:'Dallas',       date:'2026-06-27', roofed:true,  altitude:186  },
  // GROUP K
  { id:'K1', group:'K', home:'POR', away:'COD', venue:'NRG Stadium',            city:'Houston',      date:'2026-06-17', roofed:true,  altitude:35   },
  { id:'K2', group:'K', home:'UZB', away:'COL', venue:'Estadio Azteca',         city:'Mexico City',  date:'2026-06-17', roofed:false, altitude:2240 },
  { id:'K3', group:'K', home:'POR', away:'UZB', venue:'NRG Stadium',            city:'Houston',      date:'2026-06-23', roofed:true,  altitude:35   },
  { id:'K4', group:'K', home:'COL', away:'COD', venue:'Estadio Akron',          city:'Guadalajara',  date:'2026-06-23', roofed:false, altitude:1566 },
  { id:'K5', group:'K', home:'COL', away:'POR', venue:'Hard Rock Stadium',      city:'Miami',        date:'2026-06-27', roofed:false, altitude:2    },
  { id:'K6', group:'K', home:'COD', away:'UZB', venue:'Mercedes-Benz Stadium',  city:'Atlanta',      date:'2026-06-27', roofed:true,  altitude:287  },
  // GROUP L
  { id:'L1', group:'L', home:'ENG', away:'CRO', venue:'AT&T Stadium',           city:'Dallas',       date:'2026-06-17', roofed:true,  altitude:186  },
  { id:'L2', group:'L', home:'GHA', away:'PAN', venue:'BMO Field',              city:'Toronto',      date:'2026-06-17', roofed:false, altitude:76   },
  { id:'L3', group:'L', home:'ENG', away:'GHA', venue:'Gillette Stadium',       city:'Boston',       date:'2026-06-23', roofed:false, altitude:24   },
  { id:'L4', group:'L', home:'PAN', away:'CRO', venue:'BMO Field',              city:'Toronto',      date:'2026-06-23', roofed:false, altitude:76   },
  { id:'L5', group:'L', home:'CRO', away:'GHA', venue:'Lincoln Financial Field',city:'Philadelphia', date:'2026-06-27', roofed:false, altitude:11   },
  { id:'L6', group:'L', home:'PAN', away:'ENG', venue:'MetLife Stadium',        city:'New York',     date:'2026-06-27', roofed:false, altitude:2    },
]

async function generateAnalysis(fixture, isPlayed, result) {
  const home = TEAM_DATA[fixture.home]
  const away = TEAM_DATA[fixture.away]
  if (!home || !away) return null

  const resultLine = isPlayed && result
    ? `Final score: ${home.name} ${result.home_score}-${result.away_score} ${away.name}`
    : `Not yet played.`

  const prompt = `You are a world-class football analyst covering the 2026 FIFA World Cup. Write ONE analytical paragraph of 180-200 words.

MATCH: ${home.flag} ${home.name} (FIFA #${home.fifaRank}) vs ${away.flag} ${away.name} (FIFA #${away.fifaRank})
Group ${fixture.group} · ${fixture.venue}, ${fixture.city} · ${fixture.date}
Status: ${isPlayed ? 'COMPLETED' : 'UPCOMING'} · ${resultLine}
Roof: ${fixture.roofed ? 'COVERED (heat neutralised)' : 'OPEN AIR'} · Altitude: ${fixture.altitude}m${fixture.altitude > 1500 ? ' (HIGH)' : ''}

${home.name.toUpperCase()}: Heat ${home.heat} · Pitch ${home.pitch} · Alt ${home.altitude} · Travel ${home.travel} · Crowd ${home.crowd} · ${home.insight}
${away.name.toUpperCase()}: Heat ${away.heat} · Pitch ${away.pitch} · Alt ${away.altitude} · Travel ${away.travel} · Crowd ${away.crowd} · ${away.insight}

Write ONE paragraph (180-200 words): tactical matchup, venue conditions impact, 2-3 key players each, ${isPlayed ? 'what result means for group qualification.' : 'specific scoreline prediction and best value bet. End with: "Not betting advice. Gamble responsibly."'}

Be specific. Name real players. Write like The Athletic.`

  const msg = await claude.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })
  return msg.content[0].text
}

export async function pregenerateUpcoming() {
  const today    = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const upcomingIds = FIXTURES
    .filter(f => f.date === today || f.date === tomorrow)
    .map(f => f.id)

  if (!upcomingIds.length) return

  const { data: existing } = await supabase
    .from('analyses')
    .select('fixture_id')
    .in('fixture_id', upcomingIds)

  const existingIds = new Set((existing || []).map(a => a.fixture_id))
  const toGenerate  = upcomingIds.filter(id => !existingIds.has(id))

  for (const fixtureId of toGenerate) {
    const fixture = FIXTURES.find(f => f.id === fixtureId)
    if (!fixture) continue
    try {
      console.log(`Pre-generating analysis for ${fixtureId}...`)
      const analysis = await generateAnalysis(fixture, false, null)
      if (analysis) {
        await supabase.from('analyses').upsert({
          fixture_id: fixtureId,
          content:    analysis,
          has_result: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'fixture_id' })
        console.log(`Done: ${fixtureId}`)
      }
      await new Promise(r => setTimeout(r, 2000))
    } catch (e) {
      console.error(`Failed ${fixtureId}:`, e.message)
    }
  }
}

export async function postgenerateResult(fixtureId, result) {
  const fixture = FIXTURES.find(f => f.id === fixtureId)
  if (!fixture) return
  try {
    console.log(`Post-generating analysis for ${fixtureId}...`)
    const analysis = await generateAnalysis(fixture, true, result)
    if (analysis) {
      await supabase.from('analyses').upsert({
        fixture_id: fixtureId,
        content:    analysis,
        has_result: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'fixture_id' })
      console.log(`Post-match done: ${fixtureId}`)
    }
  } catch (e) {
    console.error(`Post-gen failed ${fixtureId}:`, e.message)
  }
}
