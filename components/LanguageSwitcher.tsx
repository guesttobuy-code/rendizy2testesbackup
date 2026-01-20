import React from 'react';
import { Languages, Check } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useLanguage, type Language } from '../contexts/LanguageContext';

const languageNames: Record<Language, { name: string; flag: string }> = {
  'pt-BR': { name: 'Português', flag: '🇧🇷' },
  'en-US': { name: 'English', flag: '🇺🇸' },
  'es-ES': { name: 'Español', flag: '🇪🇸' },
};

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{languageNames[language].flag}</span>
          <span className="hidden md:inline">{languageNames[language].name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(languageNames) as Language[]).map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className="gap-2"
          >
            <span className="text-lg">{languageNames[lang].flag}</span>
            <span>{languageNames[lang].name}</span>
            {language === lang && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
