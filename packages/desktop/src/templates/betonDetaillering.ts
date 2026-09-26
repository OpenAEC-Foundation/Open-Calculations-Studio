/**
 * Beton detaillering — drie detailleringstoetsen van NEN-EN 1992-1-1 met de
 * Nederlandse NB in één blad. De keuze bovenin (onderwerp) bepaalt welk deel
 * rekent.
 *
 * ── Betondekking (onderwerp 1, §4.4.1) ──────────────────────────────────────
 *
 * c_nom = c_min + Δc_dev (4.1) met c_min = max(c_min,b; c_min,dur + Δc_dur,γ −
 * Δc_dur,st − Δc_dur,add; 10 mm) (4.2). De NB zet de drie Δc_dur-termen op
 * 0 mm (4.4.1.2(6)–(8)) en Δc_dev op 5 mm (4.4.1.3(1)).
 *
 *   • c_min,dur uit tabel 4.4N zoals de NB hem leest (betonstaal), met de
 *     constructieklasse uit tabel 4.3N van de NB: S4 bij 50 jaar, +2 bij een
 *     ontwerplevensduur van 100 jaar en +1 bij 75 jaar (DesignLife uit de
 *     projectgegevens), −1 voor de sterkteklasse, voor plaatgeometrie en voor
 *     kwaliteitsbeheersing, begrensd tot S1…S6. De sterkteklassegrens is
 *     bekend voor X0, XC1 en XC2/XC3 (C30/37, C30/37, C35/45) en XC4 en XD1
 *     (C40/50); voor XD2, XD3 en de XS-klassen is hij invoer. Voetnoot 2: bij
 *     meer dan 4 % lucht één sterkteklasse lager.
 *   • c_min,b uit tabel 4.2: de staafdiameter, bij een bundel Φ_n = Φ·√n_b
 *     (8.14), plus 5 mm bij d_g > 32 mm. Beugel en hoofdstaaf apart.
 *   • Oneffen oppervlak +5 mm (4.4.1.2(11)); XM volgens de NB +0 mm
 *     (4.4.1.2(13)); XF en XA geven geen c_min,dur (4.4.1.2(12)).
 *   • Reductie van Δc_dev tot 5 mm bij een zeer nauwkeurige meting met afkeur
 *     (NB bij 4.4.1.3(3)), niet samen met de klassevermindering voor
 *     kwaliteitsbeheersing (opmerking bij tabel 4.3N van de NB).
 *   • Gestort tegen een voorbereide ondergrond c_nom ≥ c_min,dur + 10 mm,
 *     direct tegen de grond ≥ c_min,dur + 50 mm (NB bij 4.4.1.3(4)).
 *
 * ── Wapeningstabellen (onderwerp 2) ─────────────────────────────────────────
 *
 * A_s per m voor Ø 6…32 bij h.o.h. 75…300 mm (plaat of wand) en A_s voor
 * 1…10 staven Ø 8…40 (balk). Vrije ruimte tussen staven max(Ø; d_g + 5 mm;
 * 20 mm) (8.2(2), k_1 = 1 en k_2 = 5 volgens de NB). Grootste h.o.h.: plaat
 * volgens de NB bij 9.3.1.1(3) en 9.3.1.1(8), wand 9.6.2(3) en 9.6.3(2).
 * A_s,max = 0,04·A_c (NB bij 9.2.1.1(3), via 9.3.1.1(1); wand 9.6.2(1)). Bij
 * een benodigde A_s per diameter de lichtste passende keuze, op volgorde van
 * gewicht. Een balklaag heeft ten minste twee staven: één in elke beugelhoek
 * (ontwerpaanname). De gekozen wapening wordt getoetst; zonder keuze de
 * lichtste.
 *
 * ── Wandwapening (onderwerp 3, §9.6) ────────────────────────────────────────
 *
 * Afmetingen (9.6.1): l/h ≥ 4, dragend ≥ 100 mm, dubbel net ≥ 120 mm, +5 mm
 * per blijvend bekist oppervlak, ≥ 2,5·d_g, staven ≥ Ø5. A_s,vmin = 0 en
 * A_s,hmin = 0 volgens de NB; A_s,vmax = 0,04·A_c buiten overlappingslassen.
 * h.o.h. verticaal ≤ min(3h; 400 mm), horizontaal ≤ 400 mm. Dwarswapening:
 * boven 0,02·A_c verticaal beugels volgens 9.5.3 (9.6.4(1)), en bij verticale
 * staven aan de buitenkant ten minste 4 per m² (9.6.4(2)), tenzij Ø ≤ 16 mm
 * met een dekking groter dan 2Ø.
 *
 * Variabelenamen komen overeen met BetonDetailleringDesigner.tsx; dat beeld
 * leest de uitkomsten uit dit blad. Controle: scripts/check-betondetaillering.mjs.
 */

export const betonDetaillering = `"Beton detaillering — NEN-EN 1992-1-1 §4.4.1, §8.2, §9.2, §9.3 en §9.6

'<i>Drie detailleringstoetsen in één blad, met de waarden van de Nederlandse NB. Kies bovenin het onderwerp: de betondekking (§4.4.1) uit de milieuklasse, de constructieklasse en de uitvoeringstolerantie; wapeningstabellen met de kleinste en grootste staafafstand (§8.2, §9.2.1.1, §9.3.1.1 en §9.6), met bij een benodigde A<sub>s</sub> de lichtste passende keuzes; of de wapening van een wand (§9.6).</i><span class="alleen-scherm"></span>

@select onderwerp "Onderwerp"
  Betondekking (§4.4.1) = 1
  Wapeningstabellen en staafafstanden = 2
  Wandwapening (§9.6) = 3
@end

d_g = ?*(mm)', grootste korrelafmeting d<sub>g</sub> van het toeslagmateriaal'

#hide
'Vrije ruimte tussen evenwijdige staven (8.2(2)) met k_1 = 1 en k_2 = 5 mm volgens de NB.
a_vrij(ds) = max(ds; d_g + 5 mm; 20 mm)
amin(ds) = max(ds; d_g/(1 mm) + 5; 20)
uc(a; r) = if(a ≤ 0*r; 0; a/r)
KL = ["C12/15"; "C16/20"; "C20/25"; "C25/30"; "C30/37"; "C35/45"; "C40/50"; "C45/55"; "C50/60"; "C55/67"; "C60/75"; "C70/85"; "C80/95"; "C90/105"]
#show

#if onderwerp ≡ 1

    # 1. Milieuklasse en constructieklasse

    @select milieuklasse "Milieuklasse voor corrosie van de wapening (tabel 4.1)"
      X0 — geen risico op corrosie = 1
      XC1 — carbonatatie, droog of blijvend nat = 2
      XC2 — carbonatatie, nat en zelden droog = 3
      XC3 — carbonatatie, matige vochtigheid = 4
      XC4 — carbonatatie, wisselend nat en droog = 5
      XD1 — chloriden, matige vochtigheid = 6
      XD2 — chloriden, nat en zelden droog = 7
      XD3 — chloriden, wisselend nat en droog = 8
      XS1 — zout uit de lucht, geen contact met zeewater = 9
      XS2 — blijvend onder zeewater = 10
      XS3 — getijde-, spat- en stuifzone = 11
    @end

    @select aantasting "Aantasting van het beton zelf (tabel 4.1)"
      Geen = 0
      XF1 — vorst en dooi, niet verzadigd, zonder dooizouten = 1
      XF2 — vorst en dooi, niet verzadigd, met dooizouten = 2
      XF3 — vorst en dooi, verzadigd, zonder dooizouten = 3
      XF4 — vorst en dooi, verzadigd, met dooizouten of zeewater = 4
      XA1 — zwak agressief chemisch milieu = 5
      XA2 — matig agressief chemisch milieu = 6
      XA3 — sterk agressief chemisch milieu = 7
      XM1 — matige afslijting = 8
      XM2 — zware afslijting = 9
      XM3 — extreme afslijting = 10
    @end

    @select betonklasse "Betonsterkteklasse"
      C12/15 = 1
      C16/20 = 2
      C20/25 = 3
      C25/30 = 4
      C30/37 = 5
      C35/45 = 6
      C40/50 = 7
      C45/55 = 8
      C50/60 = 9
      C55/67 = 10
      C60/75 = 11
      C70/85 = 12
      C80/95 = 13
      C90/105 = 14
    @end

    @select luchtbel "Luchtinsluiting van meer dan 4 % (tabel 4.3N, voetnoot 2)"
      Nee = 0
      Ja = 1
    @end

    #if milieuklasse ≥ 7
        '<i>Voor deze milieuklasse is de sterkteklasse waarboven tabel 4.3N (NB) één constructieklasse vermindering geeft invoer: lees hem af in de kolom van de tabel die bij de milieuklasse hoort.</i><span class="alleen-scherm"></span>
        @select grensklasse "Grens van de sterkteklasse in tabel 4.3N"
          C25/30 = 4
          C30/37 = 5
          C35/45 = 6
          C40/50 = 7
          C45/55 = 8
          C50/60 = 9
          C55/67 = 10
          C60/75 = 11
          Geen vermindering toepassen = 99
        @end
    #else
        #hide
        grensklasse = 99
        #show
    #end if

    @select plaatvorm "Element met plaatgeometrie, plaats van de wapening niet beïnvloed door het bouwproces"
      Nee = 0
      Ja = 1
    @end

    @select kwaliteit "Specifieke kwaliteitsbeheersing van de betonproductie gewaarborgd"
      Nee = 0
      Ja = 1
    @end

    #hide
    'Sterkteklassegrens per milieuklasse waar tabel 4.3N (NB) hem geeft: X0 en XC1 C30/37,
    'XC2/XC3 C35/45, XC4 en XD1 C40/50. Klassen als volgnummer in KL.
    GR = [5; 5; 6; 6; 7; 7; 99; 99; 99; 99; 99]
    i_mk = min(max(milieuklasse; 1); 11)
    i_grens = if(milieuklasse ≤ 6; GR.(i_mk); grensklasse) - luchtbel
    i_gn = min(max(i_grens; 1); 14)
    i_bk = min(max(betonklasse; 1); 14)
    Δ_ld = if(DesignLife ≥ 100; 2; if(DesignLife ≥ 75; 1; 0))
    Δ_sk = if(betonklasse ≥ i_grens; -1; 0)
    Δ_pl = -plaatvorm
    Δ_kb = -kwaliteit
    S_ber = 4 + Δ_ld + Δ_sk + Δ_pl + Δ_kb
    MK = ["X0"; "XC1"; "XC2"; "XC3"; "XC4"; "XD1"; "XD2"; "XD3"; "XS1"; "XS2"; "XS3"]
    mk_naam = MK.(i_mk)
    grens_naam = if(i_grens > 14; "geen"; KL.(i_gn))
    pm(x) = if(x > 0; "+"; "")
    #show
    '<table style="border-collapse:collapse; font-size:0.9em; line-height:1.3;">
    '<tr style="border-bottom:1.5px solid #374151;"><th style="text-align:left; padding:1px 10px 1px 0;">Tabel 4.3N (NB)</th><th style="text-align:left; padding:1px 10px;">Hier</th><th style="text-align:right; padding:1px 0 1px 10px;">Klassen</th></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 10px 0 0;">Uitgangspunt: ontwerplevensduur 50 jaar (NB bij 4.4.1.2(5))</td><td style="padding:0 10px;">S4</td><td style="text-align:right;">4</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 10px 0 0;">Ontwerplevensduur 100 jaar: +2, 75 jaar: +1</td><td style="padding:0 10px;">'DesignLife' jaar (projectgegevens)</td><td style="text-align:right;">'pm(Δ_ld)''Δ_ld'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 10px 0 0;">Sterkteklasse, grens bij 'mk_naam': 'grens_naam''if(luchtbel ≡ 1 and i_grens ≤ 14; ", een klasse lager door de luchtinsluiting"; "")'; −1 vanaf de grens</td><td style="padding:0 10px;">'KL.(i_bk)'</td><td style="text-align:right;">'Δ_sk'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 10px 0 0;">Element met plaatgeometrie: −1</td><td style="padding:0 10px;">'if(plaatvorm ≡ 1; "ja"; "nee")'</td><td style="text-align:right;">'Δ_pl'</td></tr>
    '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 10px 0 0;">Specifieke kwaliteitsbeheersing: −1</td><td style="padding:0 10px;">'if(kwaliteit ≡ 1; "ja"; "nee")'</td><td style="text-align:right;">'Δ_kb'</td></tr>
    '</table>
    S_kl = min(max(S_ber; 1); 6)', constructieklasse S1 … S6 (NB bij 4.4.1.2(5): ten minste S1)'
    #if DesignLife < 50
        '<i>Tabel 4.3N (NB) kent voor een kortere ontwerplevensduur dan 50 jaar geen vermindering: het uitgangspunt blijft S4.</i><span class="alleen-scherm"></span>
    #end if
    #hide
    'Tabel 4.4N zoals de NB hem leest, betonstaal. Rij S1 … S6, kolom X0, XC1, XC2/XC3, XC4,
    'XD1/XS1, XD2/XS2, XD3/XS3.
    K44 = [[10; 10; 10; 15; 20; 25; 25]; [10; 10; 15; 20; 25; 30; 30]; [10; 10; 20; 25; 30; 35; 35]; [10; 15; 25; 30; 35; 40; 40]; [15; 20; 30; 35; 40; 45; 45]; [20; 25; 35; 40; 45; 50; 50]]
    KOL = [1; 2; 3; 3; 4; 5; 6; 7; 5; 6; 7]
    j_mk = KOL.(i_mk)
    c_min,dur = K44.(S_kl; j_mk)*mm
    #show
    'Milieuklasse 'mk_naam' in constructieklasse S'S_kl':
    c_min,dur', tabel 4.4N (NB), betonstaal'
    #if aantasting ≥ 1 and aantasting ≤ 7
        '<i>Tabel 4.4N geeft geen c<sub>min,dur</sub> voor vorst en dooi (XF) of chemische aantasting (XA): volgens 4.4.1.2(12) volstaat in het algemeen een dekking volgens 4.4; die klassen stellen eisen aan de betonsamenstelling (EN 206).</i>
    #else if aantasting ≥ 8
        '<i>Afslijting (4.4.1.2(13)): de toeslag k<sub>1</sub>, k<sub>2</sub> of k<sub>3</sub> voor XM1, XM2 en XM3 is volgens de NB 0 mm.</i>
    #end if

    # 2. Minimumdekking — (4.2)

    ds_hfd = ?*(mm)', hoofdstaaf: Ø<span class="kolom-2"></span>'
    ds_bgl = ?*(mm)', beugel of dwarsstaaf buiten de hoofdstaaf: Ø, 0 = geen<span class="kolom-2"></span>'

    @select n_bundel "Hoofdstaven (8.9.1)"
      Afzonderlijke staaf = 1
      Bundel van 2 staven = 2
      Bundel van 3 staven = 3
      Bundel van 4 staven, alleen verticale drukstaven en overlappingslassen = 4
    @end

    @select oppervlak "Betonoppervlak"
      Glad: bekist of afgewerkt = 1
      Oneffen, bijvoorbeeld uitgewassen met zichtbaar toeslagmateriaal (4.4.1.2(11)) = 2
    @end

    #hide
    Δ_dg = if(d_g > 32 mm; 5 mm; 0 mm)
    Δ_opp = if(oppervlak ≡ 2; 5 mm; 0 mm)
    #show
    '<i>c<sub>min,b</sub> volgens tabel 4.2: de staafdiameter, bij een bundel de gelijkwaardige diameter Φ<sub>n</sub>, plus 5 mm als d<sub>g</sub> groter is dan 32 mm. In (4.2) zijn Δc<sub>dur,γ</sub>, Δc<sub>dur,st</sub> en Δc<sub>dur,add</sub> volgens de NB 0 mm (4.4.1.2(6), (7) en (8)); bij een oneffen oppervlak komt er 5 mm bij (4.4.1.2(11)).</i><span class="alleen-scherm"></span>
    #if n_bundel > 1
        Φ_n = ds_hfd*sqrt(n_bundel)', gelijkwaardige diameter (8.14), ten hoogste 55 mm'
    #else
        #hide
        Φ_n = ds_hfd
        #show
    #end if
    c_min,b,hfd = Φ_n + Δ_dg', hoofdstaaf, tabel 4.2<span class="kolom-2"></span>'
    c_min,hfd = max(c_min,b,hfd; c_min,dur; 10 mm) + Δ_opp', (4.2)<span class="kolom-2"></span>'
    #if ds_bgl > 0 mm
        c_min,b,bgl = ds_bgl + Δ_dg', beugel, tabel 4.2<span class="kolom-2"></span>'
        c_min,bgl = max(c_min,b,bgl; c_min,dur; 10 mm) + Δ_opp', (4.2)<span class="kolom-2"></span>'
    #end if

    # 3. Nominale dekking — (4.1)

    @select uitvoering "Uitvoeringstolerantie Δc_dev (4.4.1.3)"
      Standaard, 5 mm volgens de NB = 1
      Zeer nauwkeurige meting met afkeur van elementen die niet voldoen (4.4.1.3(3)) = 2
    @end
    #if uitvoering ≡ 2
        red_dev = ?*(mm)', reductie van Δc<sub>dev</sub>: 0 tot 5 mm (NB bij 4.4.1.3(3))'
    #else
        #hide
        red_dev = 0 mm
        #show
    #end if
    #if kwaliteit ≡ 1 and uitvoering ≡ 2
        '<b style="color:#b91c1c">De vermindering van een constructieklasse voor kwaliteitsbeheersing mag niet samengaan met een reductie van Δc<sub>dev</sub> (opmerking bij tabel 4.3N, NB): de reductie van Δc<sub>dev</sub> is niet toegepast.</b>
    #end if
    #hide
    red_toe = if(kwaliteit ≡ 1 or uitvoering ≡ 1; 0 mm; min(max(red_dev; 0 mm); 5 mm))
    #show
    #if red_toe > 0 mm
        Δc_dev = 5 mm - red_toe', NB bij 4.4.1.3(1), met de reductie van 4.4.1.3(3)'
    #else
        Δc_dev = 5 mm', NB bij 4.4.1.3(1)'
    #end if

    @select ondergrond "Gestort tegen (4.4.1.3(4))"
      Bekisting = 1
      Een voorbereide ondergrond, ook een werkvloer = 2
      Direct tegen de grond = 3
    @end

    c_nom,hfd = c_min,hfd + Δc_dev', hoofdstaaf<span class="kolom-2"></span>'
    #if ds_bgl > 0 mm
        c_nom,bgl = c_min,bgl + Δc_dev', beugel<span class="kolom-2"></span>'
    #end if
    #if ondergrond ≡ 2
        c_ond = c_min,dur + 10 mm', k<sub>1</sub> ≥ c<sub>min,dur</sub> + 10 mm op de buitenste staaf (NB bij 4.4.1.3(4))'
    #else if ondergrond ≡ 3
        c_ond = c_min,dur + 50 mm', k<sub>2</sub> ≥ c<sub>min,dur</sub> + 50 mm op de buitenste staaf (NB bij 4.4.1.3(4))'
    #else
        #hide
        c_ond = 0 mm
        #show
    #end if

    # 4. Toetsing

    c_dek = ?*(mm)', dekking op de buitenste staaf, zoals op de tekening'
    #if c_dek ≤ 0 mm or ds_hfd ≤ 0 mm or ds_bgl < 0 mm
        '<b style="color:#b91c1c">De dekking of de diameter van de hoofdstaaf is nul: er valt niets te toetsen.</b>
        '<b>Maatgevende UC = —</b><span style="color: red"> → <b>voldoet niet</b></span>
    #else
        #if ds_bgl > 0 mm
            c_eis,bgl = max(c_nom,bgl; c_ond)', vereist op de beugel<span class="kolom-2"></span>'
            UC_c,bgl = c_eis,bgl/c_dek'<span class="kolom-2"></span>'
            c_hfd = c_dek + ds_bgl', aanwezig op de hoofdstaaf<span class="kolom-2"></span>'
            UC_c,hfd = c_nom,hfd/c_hfd'<span class="kolom-2"></span>'
        #else
            #hide
            UC_c,bgl = 0
            #show
            c_eis,hfd = max(c_nom,hfd; c_ond)', vereist op de hoofdstaaf<span class="kolom-2"></span>'
            UC_c,hfd = c_eis,hfd/c_dek'<span class="kolom-2"></span>'
        #end if
        #if n_bundel > 1
            UC_Φn = Φ_n/(55 mm)', (8.14): Φ<sub>n</sub> ≤ 55 mm'
        #else
            #hide
            UC_Φn = 0
            #show
        #end if
        '<i>Een grotere dekking kan nodig zijn voor de brandwerendheid (4.4.1.2(1), EN 1992-1-2); die staat hier niet in.</i><span class="alleen-scherm"></span>

        # 5. Samenvatting

        UC_max = max(UC_c,bgl; UC_c,hfd; UC_Φn)', grootste van de toetsen hierboven'
        #if UC_max ≤ 1
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
        #else
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
        #end if
    #end if

#else if onderwerp ≡ 2

    # 1. Toepassing

    @select toepassing "Toepassing"
      Vloer of plaat: staven per m breedte = 1
      Wand: staven per m lengte = 2
      Balk: n staven in één laag = 3
    @end

    h_el = ?*(mm)', dikte of hoogte h van het element<span class="kolom-2"></span>'
    #if toepassing ≡ 1
        @select rol "Wapening in de plaat"
          Hoofdwapening = 1
          Verdeelwapening = 2
        @end
        @select zone "Gebied (9.3.1.1(3))"
          Algemeen = 1
          Grootste moment of geconcentreerde belasting = 2
        @end
    #else if toepassing ≡ 2
        @select richting "Staven in de wand"
          Verticaal = 1
          Horizontaal = 2
        @end
    #else
        b_el = ?*(mm)', breedte b<span class="kolom-2"></span>'
        c_dek = ?*(mm)', dekking op de beugel<span class="kolom-2"></span>'
        ds_bgl = ?*(mm)', beugel: Ø<span class="kolom-2"></span>'
    #end if
    A_nodig = ?', benodigde A<sub>s</sub>: in mm²/m bij een plaat of wand, in mm² bij een balk; 0 = alleen de tabel'

    # 2. Staafafstanden en grootste wapening

    '<i>Vrije ruimte tussen evenwijdige staven ten minste a<sub>min</sub> = max(Ø; d<sub>g</sub> + 5 mm; 20 mm) (8.2(2), k<sub>1</sub> = 1 en k<sub>2</sub> = 5 mm volgens de NB); de kleinste h.o.h.-afstand is dan s<sub>min</sub> = Ø + a<sub>min</sub>.</i><span class="alleen-scherm"></span>
    a_min = max(d_g + 5 mm; 20 mm)', vrije ruimte bij staven tot deze diameter; bij een dikkere staaf de diameter zelf'
    #if toepassing ≡ 1
        #if rol ≡ 1 and zone ≡ 1
            s_max = min(3*h_el; 400 mm)', hoofdwapening: 3h en ≤ 400 mm (NB bij 9.3.1.1(3))'
        #else if rol ≡ 1
            s_max = min(2*h_el; 250 mm)', hoofdwapening bij het grootste moment of een geconcentreerde belasting: 2h en ≤ 250 mm (NB bij 9.3.1.1(3))'
        #else if zone ≡ 1
            s_max = min(3.5*h_el; 450 mm)', verdeelwapening: 3,5h en ≤ 450 mm (NB bij 9.3.1.1(3))'
        #else
            s_max = min(3*h_el; 400 mm)', verdeelwapening bij het grootste moment of een geconcentreerde belasting: 3h en ≤ 400 mm (NB bij 9.3.1.1(3))'
        #end if
        #if h_el > 250 mm
            s_max = min(s_max; 250 mm)', dikker dan 250 mm: onder- en bovennet met staafafstanden van ten hoogste 250 mm (9.3.1.1(8))'
        #end if
        A_c = h_el*1000 mm to mm^2', per m breedte'
        A_s,max = 0.04*A_c', trek- of drukwapening buiten overlappingslassen (NB bij 9.2.1.1(3), via 9.3.1.1(1))'
        '<i>Staven van de hoofd- en de verdeelwapening ten minste Ø5 (9.3.1.1(5) en (6)).</i><span class="alleen-scherm"></span>
        #hide
        ds_mn = 5 mm
        met_max = 1
        past_t = if(h_el > 0 mm; 1; 0)
        #show
    #else if toepassing ≡ 2
        #if richting ≡ 1
            s_max = min(3*h_el; 400 mm)', verticaal: 3h en ≤ 400 mm (9.6.2(3))'
            A_c = h_el*1000 mm to mm^2', per m wandlengte'
            A_s,max = 0.04*A_c', verticaal, beide zijden samen, buiten overlappingslassen (NB bij 9.6.2(1)); de tabel geeft één net'
            #hide
            met_max = 1
            #show
        #else
            s_max = 400 mm', horizontaal (9.6.3(2))'
            #hide
            A_s,max = 10^9 mm^2
            met_max = 0
            #show
        #end if
        '<i>Staven ten minste Ø5 (9.6.1(3)).</i><span class="alleen-scherm"></span>
        #hide
        ds_mn = 5 mm
        past_t = if(h_el > 0 mm; 1; 0)
        #show
    #else
        b_besch = b_el - 2*(c_dek + ds_bgl)', breedte binnen de beugels'
        A_c = b_el*h_el to mm^2
        A_s,max = 0.04*A_c', trek- of drukwapening buiten overlappingslassen (NB bij 9.2.1.1(3))'
        '<i>Langsstaven ten minste Ø6 (9.2.1.1(5)). In één laag passen n staven als n·Ø + (n − 1)·a<sub>min</sub> ≤ b<sub>besch</sub>; ten minste twee staven, één in elke beugelhoek (ontwerpaanname).</i><span class="alleen-scherm"></span>
        #hide
        ds_mn = 6 mm
        met_max = 1
        past_t = if(h_el > 0 mm and b_el > 0 mm and b_besch > 0 mm; 1; 0)
        #show
    #end if

    #if past_t ≡ 0
        '<b style="color:#b91c1c">De afmetingen zijn niet compleet: de hoogte of breedte is nul, of er blijft binnen de beugels geen breedte over. Er valt niets te toetsen.</b>
        '<b>Maatgevende UC = —</b><span style="color: red"> → <b>voldoet niet</b></span>
    #else
        #hide
        An = max(A_nodig; 0)
        Am = A_s,max/(1 mm^2)
        #show

        # 3. Tabel

        #if toepassing ≤ 2
            #hide
            smx = s_max/(1 mm)
            D_p = [6; 8; 10; 12; 16; 20; 25; 32]
            S_p = [75; 100; 125; 150; 175; 200; 250; 300]
            Ap(i; k) = pi/4*D_p.(i)^2*1000/S_p.(k)
            sminp(i) = D_p.(i) + amin(D_p.(i))
            magp(i; k) = if(S_p.(k) ≤ smx and S_p.(k) ≥ sminp(i) and Ap(i; k) ≤ Am; 1; 0)
            skp(i; k) = if(magp(i; k) ≡ 1 and Ap(i; k) ≥ An; S_p.(k); 0)
            skies(i) = max(skp(i; 1); skp(i; 2); skp(i; 3); skp(i; 4); skp(i; 5); skp(i; 6); skp(i; 7); skp(i; 8))
            Ak(i) = if(skies(i) > 0; pi/4*D_p.(i)^2*1000/max(skies(i); 1); 10^9)
            bgp(i; k) = if(An > 0 and magp(i; k) ≡ 1 and Ap(i; k) ≥ An; if(S_p.(k) ≡ skies(i); "#bbf7d0"; "#f0fdf4"); "transparent")
            kp(i; k) = if(magp(i; k) ≡ 1; "inherit"; "#9ca3af")
            fp(i; k) = if(An > 0 and S_p.(k) ≡ skies(i); "700"; "400")
            #show
            '<table style="border-collapse:collapse; font-size:0.85em; line-height:1.3;">
            '<tr style="border-bottom:1px solid #374151;"><th style="text-align:left; padding:1px 5px 1px 0;">Ø</th><th style="text-align:right; padding:1px 5px;">s<sub>min</sub></th><th colspan="8" style="text-align:center; padding:1px 5px;">A<sub>s</sub> in mm²/m bij een h.o.h. in mm van</th></tr>
            '<tr style="border-bottom:1.5px solid #374151;"><th></th><th></th><th style="text-align:right; padding:0 5px;">75</th><th style="text-align:right; padding:0 5px;">100</th><th style="text-align:right; padding:0 5px;">125</th><th style="text-align:right; padding:0 5px;">150</th><th style="text-align:right; padding:0 5px;">175</th><th style="text-align:right; padding:0 5px;">200</th><th style="text-align:right; padding:0 5px;">250</th><th style="text-align:right; padding:0 5px;">300</th></tr>
            #for i = 1 : 8
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 5px 0 0;">Ø'D_p.(i)'</td><td style="text-align:right; padding:0 5px;">'sminp(i)'</td><td style="text-align:right; padding:0 5px; background:'bgp(i; 1)'; color:'kp(i; 1)'; font-weight:'fp(i; 1)'">'round(Ap(i; 1))'</td><td style="text-align:right; padding:0 5px; background:'bgp(i; 2)'; color:'kp(i; 2)'; font-weight:'fp(i; 2)'">'round(Ap(i; 2))'</td><td style="text-align:right; padding:0 5px; background:'bgp(i; 3)'; color:'kp(i; 3)'; font-weight:'fp(i; 3)'">'round(Ap(i; 3))'</td><td style="text-align:right; padding:0 5px; background:'bgp(i; 4)'; color:'kp(i; 4)'; font-weight:'fp(i; 4)'">'round(Ap(i; 4))'</td><td style="text-align:right; padding:0 5px; background:'bgp(i; 5)'; color:'kp(i; 5)'; font-weight:'fp(i; 5)'">'round(Ap(i; 5))'</td><td style="text-align:right; padding:0 5px; background:'bgp(i; 6)'; color:'kp(i; 6)'; font-weight:'fp(i; 6)'">'round(Ap(i; 6))'</td><td style="text-align:right; padding:0 5px; background:'bgp(i; 7)'; color:'kp(i; 7)'; font-weight:'fp(i; 7)'">'round(Ap(i; 7))'</td><td style="text-align:right; padding:0 5px; background:'bgp(i; 8)'; color:'kp(i; 8)'; font-weight:'fp(i; 8)'">'round(Ap(i; 8))'</td></tr>
            #loop
            '</table>
            '<i>Grijs: h.o.h. kleiner dan s<sub>min</sub> of groter dan s<sub>max</sub> = 's_max' mm'if(met_max ≡ 1; ", of A<sub>s</sub> groter dan A<sub>s,max</sub>"; "")'.'if(An > 0; " Groen: ten minste A<sub>s,nodig</sub> = "; "")''if(An > 0; An; "")''if(An > 0; " mm²/m, vet de grootste h.o.h. die dat haalt."; "")'</i>
        #else
            #hide
            bb = b_besch/(1 mm)
            D_b = [8; 10; 12; 16; 20; 25; 32; 40]
            Ab(i; n) = n*pi/4*D_b.(i)^2
            nmax(i) = max(floor((bb + amin(D_b.(i)))/(D_b.(i) + amin(D_b.(i)))); 0)
            magb(i; n) = if(n ≥ 2 and n ≤ nmax(i) and Ab(i; n) ≤ Am; 1; 0)
            nkies(i) = max(2; ceil(An/Ab(i; 1) - 10^-9))
            Ak(i) = if(magb(i; nkies(i)) ≡ 1; Ab(i; nkies(i)); 10^9)
            bgb(i; n) = if(An > 0 and magb(i; n) ≡ 1 and Ab(i; n) ≥ An; if(n ≡ nkies(i); "#bbf7d0"; "#f0fdf4"); "transparent")
            kb(i; n) = if(magb(i; n) ≡ 1; "inherit"; "#9ca3af")
            fb(i; n) = if(An > 0 and n ≡ nkies(i) and magb(i; n) ≡ 1; "700"; "400")
            #show
            '<table style="border-collapse:collapse; font-size:0.85em; line-height:1.3;">
            '<tr style="border-bottom:1px solid #374151;"><th style="text-align:left; padding:1px 5px 1px 0;">Ø</th><th style="text-align:right; padding:1px 5px;">n<sub>max</sub></th><th colspan="10" style="text-align:center; padding:1px 5px;">A<sub>s</sub> in mm² bij n staven</th></tr>
            '<tr style="border-bottom:1.5px solid #374151;"><th></th><th></th><th style="text-align:right; padding:0 5px;">1</th><th style="text-align:right; padding:0 5px;">2</th><th style="text-align:right; padding:0 5px;">3</th><th style="text-align:right; padding:0 5px;">4</th><th style="text-align:right; padding:0 5px;">5</th><th style="text-align:right; padding:0 5px;">6</th><th style="text-align:right; padding:0 5px;">7</th><th style="text-align:right; padding:0 5px;">8</th><th style="text-align:right; padding:0 5px;">9</th><th style="text-align:right; padding:0 5px;">10</th></tr>
            #for i = 1 : 8
                '<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:0 5px 0 0;">Ø'D_b.(i)'</td><td style="text-align:right; padding:0 5px;">'nmax(i)'</td><td style="text-align:right; padding:0 5px; background:'bgb(i; 1)'; color:'kb(i; 1)'; font-weight:'fb(i; 1)'">'round(Ab(i; 1))'</td><td style="text-align:right; padding:0 5px; background:'bgb(i; 2)'; color:'kb(i; 2)'; font-weight:'fb(i; 2)'">'round(Ab(i; 2))'</td><td style="text-align:right; padding:0 5px; background:'bgb(i; 3)'; color:'kb(i; 3)'; font-weight:'fb(i; 3)'">'round(Ab(i; 3))'</td><td style="text-align:right; padding:0 5px; background:'bgb(i; 4)'; color:'kb(i; 4)'; font-weight:'fb(i; 4)'">'round(Ab(i; 4))'</td><td style="text-align:right; padding:0 5px; background:'bgb(i; 5)'; color:'kb(i; 5)'; font-weight:'fb(i; 5)'">'round(Ab(i; 5))'</td><td style="text-align:right; padding:0 5px; background:'bgb(i; 6)'; color:'kb(i; 6)'; font-weight:'fb(i; 6)'">'round(Ab(i; 6))'</td><td style="text-align:right; padding:0 5px; background:'bgb(i; 7)'; color:'kb(i; 7)'; font-weight:'fb(i; 7)'">'round(Ab(i; 7))'</td><td style="text-align:right; padding:0 5px; background:'bgb(i; 8)'; color:'kb(i; 8)'; font-weight:'fb(i; 8)'">'round(Ab(i; 8))'</td><td style="text-align:right; padding:0 5px; background:'bgb(i; 9)'; color:'kb(i; 9)'; font-weight:'fb(i; 9)'">'round(Ab(i; 9))'</td><td style="text-align:right; padding:0 5px; background:'bgb(i; 10)'; color:'kb(i; 10)'; font-weight:'fb(i; 10)'">'round(Ab(i; 10))'</td></tr>
            #loop
            '</table>
            '<i>n<sub>max</sub>: het grootste aantal staven in één laag binnen b<sub>besch</sub> = 'b_besch' mm. Grijs: minder dan twee staven, meer dan n<sub>max</sub> of A<sub>s</sub> groter dan A<sub>s,max</sub>.'if(An > 0; " Groen: ten minste A<sub>s,nodig</sub> = "; "")''if(An > 0; An; "")''if(An > 0; " mm², vet het kleinste aantal dat dat haalt."; "")'</i>
        #end if

        #hide
        AK = [Ak(1); Ak(2); Ak(3); Ak(4); Ak(5); Ak(6); Ak(7); Ak(8)]
        lt(j; i) = if(AK.(j) < AK.(i) or (AK.(j) ≡ AK.(i) and j < i); 1; 0)
        rang(i) = 1 + lt(1; i) + lt(2; i) + lt(3; i) + lt(4; i) + lt(5; i) + lt(6; i) + lt(7; i) + lt(8; i)
        isL(i) = if(rang(i) ≡ 1 and AK.(i) < 10^8; i; 0)
        i_L = isL(1) + isL(2) + isL(3) + isL(4) + isL(5) + isL(6) + isL(7) + isL(8)
        iL = max(i_L; 1)
        #show

        # 4. Keuze

        #if An > 0
            #if i_L ≡ 0
                '<b style="color:#b91c1c">Geen enkele diameter uit de tabel haalt A<sub>s,nodig</sub> binnen de staafafstanden en A<sub>s,max</sub>.</b>
            #else
                '<b>Lichtste passende keuzes</b>, per diameter, op volgorde van staalgewicht:
                '<table style="border-collapse:collapse; font-size:0.85em; line-height:1.3;">
                '<tr style="border-bottom:1.5px solid #374151;"><th style="text-align:right; padding:1px 8px 1px 0;">Volgorde</th><th style="text-align:left; padding:1px 8px;">Wapening</th><th style="text-align:right; padding:1px 8px;">A<sub>s</sub>'if(toepassing ≤ 2; " [mm²/m]"; " [mm²]")'</th><th style="text-align:right; padding:1px 0 1px 8px;">A<sub>s,nodig</sub>/A<sub>s</sub></th></tr>
                #for r = 1 : 8
                    #for i = 1 : 8
                        #if rang(i) ≡ r and AK.(i) < 10^8
                            #if toepassing ≤ 2
                                '<tr style="border-bottom:1px solid #e5e7eb;'if(r ≡ 1; " font-weight:700"; "")'"><td style="text-align:right; padding:0 8px 0 0;">'r'</td><td style="padding:0 8px;">Ø'D_p.(i)'–'skies(i)'</td><td style="text-align:right; padding:0 8px;">'round(AK.(i))'</td><td style="text-align:right; padding:0 0 0 8px;">'round(100*An/AK.(i))' %</td></tr>
                            #else
                                '<tr style="border-bottom:1px solid #e5e7eb;'if(r ≡ 1; " font-weight:700"; "")'"><td style="text-align:right; padding:0 8px 0 0;">'r'</td><td style="padding:0 8px;">'nkies(i)'Ø'D_b.(i)'</td><td style="text-align:right; padding:0 8px;">'round(AK.(i))'</td><td style="text-align:right; padding:0 0 0 8px;">'round(100*An/AK.(i))' %</td></tr>
                            #end if
                        #end if
                    #loop
                #loop
                '</table>
            #end if
        #end if

        ds_kz = ?*(mm)', gekozen Ø, 0 = de lichtste passende keuze<span class="kolom-2"></span>'
        #if toepassing ≤ 2
            s_kz = ?*(mm)', h.o.h.<span class="kolom-2"></span>'
            #hide
            kz_eigen = if(ds_kz > 0 mm; 1; 0)
            ds_g = if(kz_eigen ≡ 1; ds_kz; D_p.(iL)*mm)
            s_g = if(kz_eigen ≡ 1; s_kz; skies(iL)*mm)
            past_g = if(kz_eigen ≡ 1 and s_kz > 0 mm; 1; if(kz_eigen ≡ 0 and i_L > 0 and An > 0; 1; 0))
            #show
        #else
            n_kz = ?', aantal staven<span class="kolom-2"></span>'
            #hide
            kz_eigen = if(ds_kz > 0 mm; 1; 0)
            ds_g = if(kz_eigen ≡ 1; ds_kz; D_b.(iL)*mm)
            n_g = if(kz_eigen ≡ 1; round(n_kz); nkies(iL))
            past_g = if(kz_eigen ≡ 1 and n_kz ≥ 1; 1; if(kz_eigen ≡ 0 and i_L > 0 and An > 0; 1; 0))
            #show
        #end if

        #if past_g ≡ 0
            '<b style="color:#b91c1c">Geen wapening gekozen en geen passende keuze uit de tabel'if(An > 0; ""; ": vul een benodigde A<sub>s</sub> in of kies een staaf")'. Er valt niets te toetsen.</b>
            '<b>Maatgevende UC = —</b><span style="color: red"> → <b>voldoet niet</b></span>
        #else
            #if toepassing ≤ 2
                #if kz_eigen ≡ 0
                    '<i>Geen eigen keuze: getoetst wordt de lichtste passende keuze.</i>
                #end if
                ds_g', Ø<span class="kolom-2"></span>'
                s_g', h.o.h.<span class="kolom-2"></span>'
                a_s,g = pi/4*ds_g^2/s_g*1000 mm to mm^2', aanwezig, per m<span class="kolom-2"></span>'
                UC_A = A_nodig*mm^2/a_s,g', A<sub>s,nodig</sub>/A<sub>s</sub><span class="kolom-2"></span>'
                s_min,g = ds_g + a_vrij(ds_g)', kleinste h.o.h. (8.2(2))<span class="kolom-2"></span>'
                UC_smin = s_min,g/s_g'<span class="kolom-2"></span>'
                UC_smax = s_g/s_max', s/s<sub>max</sub><span class="kolom-2"></span>'
                #if met_max ≡ 1
                    UC_Amax = a_s,g/A_s,max', A<sub>s</sub>/A<sub>s,max</sub><span class="kolom-2"></span>'
                #else
                    #hide
                    UC_Amax = 0
                    #show
                #end if
                UC_ds = ds_mn/ds_g', kleinste diameter'
                #hide
                UC_b = 0
                #show
            #else
                #if kz_eigen ≡ 0
                    '<i>Geen eigen keuze: getoetst wordt de lichtste passende keuze.</i>
                #end if
                n_g', aantal staven<span class="kolom-2"></span>'
                ds_g', Ø<span class="kolom-2"></span>'
                A_s,g = n_g*pi/4*ds_g^2 to mm^2', aanwezig<span class="kolom-2"></span>'
                UC_A = A_nodig*mm^2/A_s,g', A<sub>s,nodig</sub>/A<sub>s</sub><span class="kolom-2"></span>'
                b_nodig = n_g*ds_g + (n_g - 1)*a_vrij(ds_g)', n·Ø + (n − 1)·a<sub>min</sub> (8.2(2))<span class="kolom-2"></span>'
                UC_b = b_nodig/b_besch', b<sub>nodig</sub>/b<sub>besch</sub><span class="kolom-2"></span>'
                UC_Amax = A_s,g/A_s,max', A<sub>s</sub>/A<sub>s,max</sub><span class="kolom-2"></span>'
                UC_ds = ds_mn/ds_g', kleinste diameter'
                #hide
                UC_smin = 0
                UC_smax = 0
                #show
            #end if

            # 5. Samenvatting

            UC_max = max(UC_A; UC_smin; UC_smax; UC_b; UC_Amax; UC_ds)', grootste van de toetsen hierboven'
            #if UC_max ≤ 1
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
            #else
                '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
            #end if
        #end if
    #end if

#else

    # 1. Wand (9.6.1)

    '<i>§9.6 geldt voor gewapende wanden met een lengte van ten minste vier keer de dikte, waarbij de wapening in de sterkteberekening meetelt (9.6.1(1)). Een wand die vooral uit zijn vlak op buiging wordt belast, volgt de regels voor platen (§9.3): zie het onderwerp Wapeningstabellen.</i><span class="alleen-scherm"></span>
    h_el = ?*(mm)', wanddikte h<span class="kolom-3"></span>'
    l_w = ?*(m)', wandlengte l<span class="kolom-3"></span>'
    c_dek = ?*(mm)', dekking op de buitenste staaf<span class="kolom-3"></span>'

    @select netten "Wapeningsnetten"
      Twee: aan elke zijde één = 2
      Eén = 1
    @end

    @select dragend "Dragende wand"
      Ja = 1
      Nee = 0
    @end

    @select bekist "Oppervlakken tegen blijvende bekisting (9.6.1(2)b)"
      Geen = 0
      Eén = 1
      Twee = 2
    @end

    # 2. Wapening per net

    ds_v = ?*(mm)', verticaal: Ø<span class="kolom-4"></span>'
    s_v = ?*(mm)', h.o.h.<span class="kolom-4"></span>'
    ds_h = ?*(mm)', horizontaal: Ø<span class="kolom-4"></span>'
    s_h = ?*(mm)', h.o.h.<span class="kolom-4"></span>'

    @select buitenlaag "Laag het dichtst bij het wandoppervlak"
      Horizontale staven = 1
      Verticale staven = 2
    @end

    #hide
    past_w = if(h_el > 0 mm and l_w > 0 m and ds_v > 0 mm and s_v > 0 mm and ds_h > 0 mm and s_h > 0 mm and c_dek ≥ 0 mm; 1; 0)
    #show
    #if past_w ≡ 0
        '<b style="color:#b91c1c">De wand is niet compleet: een maat, een diameter of een h.o.h.-afstand is nul. Er valt niets te toetsen.</b>
        '<b>Maatgevende UC = —</b><span style="color: red"> → <b>voldoet niet</b></span>
    #else
        UC_lh = 4*h_el/l_w', l ≥ 4h (9.6.1(1)); anders een kolom (§9.5)'
        #hide
        h_1 = if(dragend ≡ 1; 100 mm; 0 mm)
        h_2 = if(netten ≡ 2; 120 mm; 0 mm)
        #show
        h_min = max(max(h_1; h_2) + bekist*5 mm; 2.5*d_g)', dragend ≥ 100 mm, met twee netten ≥ 120 mm, +5 mm per blijvend bekist oppervlak, en ≥ 2,5·d<sub>g</sub> (9.6.1(2))'
        UC_h = h_min/h_el'<span class="kolom-2"></span>'
        UC_ds = 5 mm/min(ds_v; ds_h)', staven ten minste Ø5 (9.6.1(3))<span class="kolom-2"></span>'

        # 3. Verticale wapening (9.6.2)

        A_c = h_el*1000 mm to mm^2', per m wandlengte<span class="kolom-2"></span>'
        a_s,v = netten*pi/4*ds_v^2/s_v*1000 mm to mm^2', beide zijden samen, per m<span class="kolom-2"></span>'
        ρ_v = 100*a_s,v/A_c', %'
        '<i>A<sub>s,vmin</sub> = 0 volgens de NB bij 9.6.2(1): §9.6 stelt geen minimum. De minimumwapening voor de beheersing van scheurvorming (7.3.2) staat daar los van.</i>
        A_s,vmax = 0.04*A_c', NB bij 9.6.2(1), buiten overlappingslassen<span class="kolom-2"></span>'
        UC_vmax = a_s,v/A_s,vmax'<span class="kolom-2"></span>'
        s_v,max = min(3*h_el; 400 mm)', 3h en ≤ 400 mm (9.6.2(3))<span class="kolom-2"></span>'
        UC_sv = s_v/s_v,max'<span class="kolom-2"></span>'
        s_v,min = ds_v + a_vrij(ds_v)', Ø + a<sub>min</sub> (8.2(2))<span class="kolom-2"></span>'
        UC_av = s_v,min/s_v'<span class="kolom-2"></span>'

        # 4. Horizontale wapening (9.6.3)

        a_s,h = netten*pi/4*ds_h^2/s_h*1000 mm to mm^2', beide zijden samen, per m hoogte'
        '<i>A<sub>s,hmin</sub> = 0 volgens de NB bij 9.6.3(1).'if(netten ≡ 1; " Bij één net ligt de horizontale wapening niet bij elk oppervlak, zoals 9.6.3(1) vraagt; met een minimum van 0 is dat geen eis aan de hoeveelheid."; "")'</i>
        s_h,max = 400 mm', 9.6.3(2)<span class="kolom-2"></span>'
        UC_sh = s_h/s_h,max'<span class="kolom-2"></span>'
        s_h,min = ds_h + a_vrij(ds_h)', Ø + a<sub>min</sub> (8.2(2))<span class="kolom-2"></span>'
        UC_ah = s_h,min/s_h'<span class="kolom-2"></span>'

        # 5. Dwarswapening (9.6.4)

        #if a_s,v > 0.02*A_c
            '<i>De verticale wapening is meer dan 0,02·A<sub>c</sub>: beugels volgens de regels voor kolommen (9.6.4(1) met 9.5.3). Binnen een afstand boven en onder een vloer of balk gaat de grootste h.o.h. met 0,6 omlaag (9.5.3(4)(i)); die afstand is bij een wand ten hoogste 4h (9.6.4(1)). Bij een overlappingslas met staven dikker dan Ø14 geldt hetzelfde, met ten minste drie beugels over de laslengte (9.5.3(4)(ii)).</i><span class="alleen-scherm"></span>
            ds_dw = ?*(mm)', beugel: Ø<span class="kolom-2"></span>'
            s_dw = ?*(mm)', h.o.h. langs de wandhoogte<span class="kolom-2"></span>'
            @select zone_dw "Plaats van de beugels (9.5.3(4))"
              Tussen vloeren en overlappingslassen = 1
              Boven of onder een vloer of balk = 2
              Bij een overlappingslas = 3
            @end
            ds_dw,min = max(6 mm; ds_v/4)', 6 mm of een kwart van de langsstaaf (9.5.3(1))<span class="kolom-2"></span>'
            UC_dw1 = ds_dw,min/ds_dw'<span class="kolom-2"></span>'
            #hide
            f_06 = if(zone_dw ≡ 2 or (zone_dw ≡ 3 and ds_v > 14 mm); 0.6; 1)
            #show
            #if f_06 < 1
                s_cl,tmax = 0.6*min(20*ds_v; h_el; 400 mm)', 0,6 × de kleinste van 20Ø, de wanddikte en 400 mm (NB bij 9.5.3(3), 9.5.3(4))<span class="kolom-2"></span>'
            #else
                s_cl,tmax = min(20*ds_v; h_el; 400 mm)', de kleinste van 20Ø, de wanddikte en 400 mm (NB bij 9.5.3(3))<span class="kolom-2"></span>'
            #end if
            UC_dw2 = s_dw/s_cl,tmax'<span class="kolom-2"></span>'
            #if zone_dw ≡ 2
                l_zone = min(4*h_el; l_w)', afstand boven en onder de vloer of balk met de kleinere h.o.h. (9.5.3(4)(i), ten hoogste 4h volgens 9.6.4(1))'
            #end if
            '<i>Elke staaf in een hoek wordt door dwarswapening opgesloten, en geen staaf in de drukzone ligt verder dan 150 mm van een opgesloten staaf (9.5.3(6)).</i><span class="alleen-scherm"></span>
        #else
            '<i>De verticale wapening is niet meer dan 0,02·A<sub>c</sub> = 'round(0.02*A_c/(1 mm^2))' mm²/m: 9.6.4(1) vraagt geen beugels.</i>
            #hide
            UC_dw1 = 0
            UC_dw2 = 0
            #show
        #end if
        #if netten ≡ 2 and buitenlaag ≡ 2
            #if ds_v ≤ 16 mm and c_dek > 2*ds_v
                '<i>De verticale staven liggen buiten, maar zijn ten hoogste Ø16 met een dekking groter dan 2Ø: volgens de opmerking bij 9.6.4(2) is geen dwarswapening nodig.</i>
                #hide
                UC_n = 0
                #show
            #else
                '<i>De verticale staven liggen het dichtst bij het wandoppervlak: dwarsverbindingen in de vorm van beugels, ten minste 4 per m² wandoppervlak (9.6.4(2)). Niet nodig bij staven tot en met Ø16 met een dekking groter dan 2Ø (opmerking bij 9.6.4(2)).</i><span class="alleen-scherm"></span>
                n_dw = ?', dwarsverbindingen per m² wandoppervlak'
                UC_n = 4/n_dw', ten minste 4 per m² (9.6.4(2))'
            #end if
        #else
            #hide
            UC_n = 0
            #show
            #if buitenlaag ≡ 1
                '<i>De horizontale staven liggen buiten: 9.6.4(2) vraagt geen dwarsverbindingen.</i>
            #else
                '<i>Eén net: 9.6.4(2) over de verbinding van de verticale staven aan beide zijden is niet van toepassing.</i>
            #end if
        #end if

        # 6. Samenvatting

        UC_max = max(UC_lh; UC_h; UC_ds; UC_vmax; UC_sv; UC_av; UC_sh; UC_ah; UC_dw1; UC_dw2; UC_n)', grootste van de toetsen hierboven'
        #if UC_max ≤ 1
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: green"> ≤ 1,0 → <b>voldoet</b></span>
        #else
            '<b>Maatgevende UC = 'UC_max'</b><span style="color: red"> > 1,0 → <b>voldoet niet</b></span>
        #end if
    #end if

#end if
`;
