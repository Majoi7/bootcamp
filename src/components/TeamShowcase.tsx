// src/components/TeamShowcase.tsx
import { useState } from 'react';
import { FaLinkedinIn, FaTwitter, FaBehance, FaInstagram } from 'react-icons/fa';
import { cn } from '@/lib/utils'; // adaptez le chemin si nécessaire
import ph1 from "../assets/photos/ph1.jpg";
import ph2 from "../assets/photos/ph2.jpg";
import ph3 from "../assets/photos/ph3.jpg";
import ph4 from "../assets/photos/ph4.jpg";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  image: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    behance?: string;
  };
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Jéhovaly DJIMADJO',
    role: 'DIRECTEUR GÉNÉRAL',
    image: ph1,
    social: { twitter: '#', linkedin: '#', behance: '#' },
  },
  {
    id: '2',
    name: 'Belline AHOKOU',
    role: 'MARKETING MANAGER',
    image: ph2,
    social: { twitter: '#', linkedin: '#' },
  },
  {
    id: '3',
    name: 'Balbine MAMADOU',
    role: 'FULL STACK DEVELOPER',
    image: ph3,
    social: { twitter: '#', linkedin: '#' },
  },
  {
    id: '4',
    name: 'Wilfrid AKAPKO',
    role: 'MONTEUR - GRAPHIC DESIGNER',
    image: ph4,
    social: { linkedin: '#' },
  },
  
];
export default function TeamShowcase() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null); // <- état de la modale

  const col1 = TEAM_MEMBERS.filter((_, i) => i % 3 === 0); // Chadrack, Jacques
  const col2 = TEAM_MEMBERS.filter((_, i) => i % 3 === 1); // Mak VieSAinte, Riche Makso
  const col3 = TEAM_MEMBERS.filter((_, i) => i % 3 === 2); // Osiris Balonga

  return (
    <>
      <div className="flex flex-col md:flex-row items-start gap-8 md:gap-10 lg:gap-14 select-none w-full max-w-5xl mx-auto py-8 px-4 md:px-6 font-sans">
        {/* ── Left: photo grid ── */}
        <div className="flex gap-2 md:gap-3 flex-shrink-0 overflow-x-auto pb-1 md:pb-0">
          {/* Column 1 */}
          <div className="flex flex-col gap-2 md:gap-3">
            {col1.map((member) => (
              <PhotoCard
                key={member.id}
                member={member}
                className="w-[110px] h-[120px] sm:w-[130px] sm:h-[140px] md:w-[155px] md:h-[165px]"
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onClick={() => setSelectedMember(member)} // ouvre la modale
              />
            ))}
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-2 md:gap-3 mt-[48px] sm:mt-[56px] md:mt-[68px]">
            {col2.map((member) => (
              <PhotoCard
                key={member.id}
                member={member}
                className="w-[122px] h-[132px] sm:w-[145px] sm:h-[155px] md:w-[172px] md:h-[182px]"
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onClick={() => setSelectedMember(member)}
              />
            ))}
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-2 md:gap-3 mt-[22px] sm:mt-[26px] md:mt-[32px]">
            {col3.map((member) => (
              <PhotoCard
                key={member.id}
                member={member}
                className="w-[115px] h-[125px] sm:w-[136px] sm:h-[146px] md:w-[162px] md:h-[172px]"
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onClick={() => setSelectedMember(member)}
              />
            ))}
          </div>
        </div>

        {/* ── Right: member name list ── */}
        <div className="flex flex-col sm:grid sm:grid-cols-2 md:flex md:flex-col gap-4 md:gap-5 pt-0 md:pt-2 flex-1 w-full">
          {TEAM_MEMBERS.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              hoveredId={hoveredId}
              onHover={setHoveredId}
            />
          ))}
        </div>
      </div>

      {/* ── MODALE ── */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedMember(null)} // ferme en cliquant sur le fond
        >
          <div
            className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()} // empêche la fermeture quand on clique sur l'image
          >
            {/* Bouton de fermeture */}
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Fermer"
            >
              ✕
            </button>

            {/* Image en grand */}
            <img
              src={selectedMember.image}
              alt={selectedMember.name}
              className="w-full h-auto max-h-[80vh] object-contain bg-gray-50"
            />

            {/* Infos de la personne */}
            <div className="p-6 text-center">
              <h3 className="text-2xl font-bold text-foreground">
                {selectedMember.name}
              </h3>
              <p className="text-sm uppercase tracking-widest text-muted-foreground mt-1">
                {selectedMember.role}
              </p>
              {/* Liens sociaux éventuellement */}
              {selectedMember.social && (
                <div className="flex justify-center gap-4 mt-4">
                  {selectedMember.social.twitter && (
                    <a href={selectedMember.social.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <FaTwitter size={20} />
                    </a>
                  )}
                  {selectedMember.social.linkedin && (
                    <a href={selectedMember.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <FaLinkedinIn size={20} />
                    </a>
                  )}
                  {selectedMember.social.instagram && (
                    <a href={selectedMember.social.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <FaInstagram size={20} />
                    </a>
                  )}
                  {selectedMember.social.behance && (
                    <a href={selectedMember.social.behance} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <FaBehance size={20} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Photo card ── */
function PhotoCard({
  member,
  className,
  hoveredId,
  onHover,
  onClick, // nouveau prop
}: {
  member: TeamMember;
  className: string;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onClick: () => void;
}) {
  const isActive = hoveredId === member.id;
  const isDimmed = hoveredId !== null && !isActive;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl cursor-pointer flex-shrink-0 transition-opacity duration-400',
        className,
        isDimmed ? 'opacity-60' : 'opacity-100',
      )}
      onMouseEnter={() => onHover(member.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick} // gère le clic
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
    >
      <img
        src={member.image}
        alt={member.name}
        className="w-full h-full object-cover transition-[filter] duration-500"
        style={{
          filter: isActive ? 'grayscale(0) brightness(1)' : 'grayscale(1) brightness(0.77)',
        }}
      />
    </div>
  );
}

/* ── Member name row ── */
function MemberRow({
  member,
  hoveredId,
  onHover,
}: {
  member: TeamMember;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  const isActive = hoveredId === member.id;
  const isDimmed = hoveredId !== null && !isActive;
  const hasSocial = member.social?.twitter || member.social?.linkedin || member.social?.instagram || member.social?.behance;

  return (
    <div
      className={cn(
        'cursor-pointer transition-opacity duration-300',
        isDimmed ? 'opacity-50' : 'opacity-100',
      )}
      onMouseEnter={() => onHover(member.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'w-4 h-3 rounded-[5px] flex-shrink-0 transition-all duration-300',
            isActive ? 'bg-foreground w-5' : 'bg-foreground/25',
          )}
        />
        <span
          className={cn(
            'text-base md:text-[18px] font-semibold leading-none tracking-tight transition-colors duration-300',
            isActive ? 'text-foreground' : 'text-foreground/80',
          )}
        >
          {member.name}
        </span>

        {hasSocial && (
          <div
            className={cn(
              'flex items-center gap-1.5 ml-0.5 transition-all duration-200',
              isActive
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-2 pointer-events-none',
            )}
          >
            {member.social?.twitter && (
              <a href={member.social.twitter} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-150 hover:scale-110" title="X / Twitter">
                <FaTwitter size={10} />
              </a>
            )}
            {member.social?.linkedin && (
              <a href={member.social.linkedin} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-150 hover:scale-110" title="LinkedIn">
                <FaLinkedinIn size={10} />
              </a>
            )}
            {member.social?.instagram && (
              <a href={member.social.instagram} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-150 hover:scale-110" title="Instagram">
                <FaInstagram size={10} />
              </a>
            )}
            {member.social?.behance && (
              <a href={member.social.behance} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all duration-150 hover:scale-110" title="Behance">
                <FaBehance size={10} />
              </a>
            )}
          </div>
        )}
      </div>
      <p className="mt-1.5 pl-[27px] text-[7px] md:text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {member.role}
      </p>
    </div>
  );
}