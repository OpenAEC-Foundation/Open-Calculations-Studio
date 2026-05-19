import { paalExample, exampleDoc } from "./examples";
import { calcpadDemo } from "./calcpad-demo";
import { calcpadSamples } from "./calcpad-samples";
import {
  ec5Buiging, ec5Afschuiving, ec5Druk, ec5DrukLoodrecht,
  ec5Knik, ec5Doorbuiging, ec5HoutenBalk,
} from "./eurocode5";
import {
  vandepitteSchuifspanning, vandepitteDoorbuiging, vandepitteKnikken,
  vandepitteMohr, vandepitteEigenfrequentie, vandepitteVirtueleArbeid,
} from "./vandepitte";
import {
  en1990Fundamenteel, en1990EQU, en1990Buitengewoon, en1990Aardbeving,
  en1990BGT, en1990Compleet, en1990GroepC, en1990Rekenwaarden, en1990Referentieperiode,
} from "./en1990";
import {
  en1991Gebruiksbelasting, en1991Sneeuwbelasting, en1991Windbelasting,
} from "./en1991";
import {
  ec3Materiaal, ec3Classificatie, ec3Trek, ec3Druk, ec3Buiging,
  ec3Dwarskracht, ec3BuigingNormaalkracht, ec3Kip, ec3Knik, ec3Doorbuiging, ec3StalenLigger,
} from "./en1993";
import {
  en1996Druksterkte, en1996Drukwand, en1996Afschuiving, en1996Slankheid,
} from "./en1996";
import {
  en1997Funderingsstrook, en1997Paaldraagvermogen, en1997Zetting, en1997Glijding,
} from "./en1997";
import {
  ec2Materiaal, ec2Buiging, ec2DwarskrachtZonder, ec2DwarskrachtMet,
  ec2Pons, ec2Scheurwijdte, ec2Doorbuiging, ec2BetonBalk,
} from "./en1992";

export const templates: Record<string, string> = {
  "calcpad-demo": calcpadDemo,
  ...calcpadSamples,
  "paaldraagvermogen": paalExample,
  "stalen-ligger": exampleDoc,
  "ec5-buiging": ec5Buiging,
  "ec5-afschuiving": ec5Afschuiving,
  "ec5-druk": ec5Druk,
  "ec5-druk-loodrecht": ec5DrukLoodrecht,
  "ec5-knik": ec5Knik,
  "ec5-doorbuiging": ec5Doorbuiging,
  "ec5-houten-balk": ec5HoutenBalk,
  "vdp-schuifspanning": vandepitteSchuifspanning,
  "vdp-doorbuiging": vandepitteDoorbuiging,
  "vdp-knikken": vandepitteKnikken,
  "vdp-mohr": vandepitteMohr,
  "vdp-eigenfrequentie": vandepitteEigenfrequentie,
  "vdp-virtuele-arbeid": vandepitteVirtueleArbeid,
  "en1990-compleet": en1990Compleet,
  "en1990-fundamenteel": en1990Fundamenteel,
  "en1990-equ": en1990EQU,
  "en1990-buitengewoon": en1990Buitengewoon,
  "en1990-aardbeving": en1990Aardbeving,
  "en1990-bgt": en1990BGT,
  "en1990-groep-c": en1990GroepC,
  "en1990-rekenwaarden": en1990Rekenwaarden,
  "en1990-referentieperiode": en1990Referentieperiode,
  "en1991-gebruiksbelasting": en1991Gebruiksbelasting,
  "en1991-sneeuwbelasting": en1991Sneeuwbelasting,
  "en1991-windbelasting": en1991Windbelasting,
  "ec3-materiaal": ec3Materiaal,
  "ec3-classificatie": ec3Classificatie,
  "ec3-trek": ec3Trek,
  "ec3-druk": ec3Druk,
  "ec3-buiging": ec3Buiging,
  "ec3-dwarskracht": ec3Dwarskracht,
  "ec3-buiging-normaalkracht": ec3BuigingNormaalkracht,
  "ec3-kip": ec3Kip,
  "ec3-knik": ec3Knik,
  "ec3-doorbuiging": ec3Doorbuiging,
  "ec3-stalen-ligger": ec3StalenLigger,
  "en1996-druksterkte": en1996Druksterkte,
  "en1996-drukwand": en1996Drukwand,
  "en1996-afschuiving": en1996Afschuiving,
  "en1996-slankheid": en1996Slankheid,
  "en1997-funderingsstrook": en1997Funderingsstrook,
  "en1997-paaldraagvermogen": en1997Paaldraagvermogen,
  "en1997-zetting": en1997Zetting,
  "en1997-glijding": en1997Glijding,
  "ec2-materiaal": ec2Materiaal,
  "ec2-buiging": ec2Buiging,
  "ec2-dwarskracht-zonder": ec2DwarskrachtZonder,
  "ec2-dwarskracht-met": ec2DwarskrachtMet,
  "ec2-pons": ec2Pons,
  "ec2-scheurwijdte": ec2Scheurwijdte,
  "ec2-doorbuiging": ec2Doorbuiging,
  "ec2-betonbalk": ec2BetonBalk,
};

export { paalExample, exampleDoc };
