/**
 * Lastresultante en statisch moment van maximaal twaalf puntlasten op één as.
 * De gebruiker geeft combinatiefactoren zelf op: dit blad kiest geen
 * normsituatie en geeft geen sterkteoordeel. Positieve momenten volgen
 * uit F·(a-a_lijn), waarbij alle posities hetzelfde nulpunt gebruiken.
 */
export const lastresultante = `"Lastresultante en statisch moment van puntlasten

'<i>Tot twaalf puntlasten op één as. Voer alle posities ten opzichte van hetzelfde nulpunt in; de momenten worden om de referentielijn bepaald. Positieve posities liggen rechts van het nulpunt. Alle invoer start op nul: vul ook de combinatiefactoren in voordat je de uitkomsten gebruikt.</i><span class="alleen-scherm"></span>

# 1. Belastingen

@select n_last "Aantal puntlasten"
  1 last = 1
  2 lasten = 2
  3 lasten = 3
  4 lasten = 4
  5 lasten = 5
  6 lasten = 6
  7 lasten = 7
  8 lasten = 8
  9 lasten = 9
  10 lasten = 10
  11 lasten = 11
  12 lasten = 12
@end

a_lijn = ?*(mm)', positie referentielijn t.o.v. nulpunt'

#hide
G_1 = 0 kN
Q_1 = 0 kN
a_1 = 0 mm
G_2 = 0 kN
Q_2 = 0 kN
a_2 = 0 mm
G_3 = 0 kN
Q_3 = 0 kN
a_3 = 0 mm
G_4 = 0 kN
Q_4 = 0 kN
a_4 = 0 mm
G_5 = 0 kN
Q_5 = 0 kN
a_5 = 0 mm
G_6 = 0 kN
Q_6 = 0 kN
a_6 = 0 mm
G_7 = 0 kN
Q_7 = 0 kN
a_7 = 0 mm
G_8 = 0 kN
Q_8 = 0 kN
a_8 = 0 mm
G_9 = 0 kN
Q_9 = 0 kN
a_9 = 0 mm
G_10 = 0 kN
Q_10 = 0 kN
a_10 = 0 mm
G_11 = 0 kN
Q_11 = 0 kN
a_11 = 0 mm
G_12 = 0 kN
Q_12 = 0 kN
a_12 = 0 mm
#show
#if n_last ≥ 1
    G_1 = ?*(kN)', blijvende last 1<span class="kolom-3"></span>'
    Q_1 = ?*(kN)', veranderlijke last 1<span class="kolom-3"></span>'
    a_1 = ?*(mm)', positie t.o.v. nulpunt<span class="kolom-3"></span>'
#end if
#if n_last ≥ 2
    G_2 = ?*(kN)', blijvende last 2<span class="kolom-3"></span>'
    Q_2 = ?*(kN)', veranderlijke last 2<span class="kolom-3"></span>'
    a_2 = ?*(mm)', positie t.o.v. nulpunt<span class="kolom-3"></span>'
#end if
#if n_last ≥ 3
    G_3 = ?*(kN)', blijvende last 3<span class="kolom-3"></span>'
    Q_3 = ?*(kN)', veranderlijke last 3<span class="kolom-3"></span>'
    a_3 = ?*(mm)', positie t.o.v. nulpunt<span class="kolom-3"></span>'
#end if
#if n_last ≥ 4
    G_4 = ?*(kN)', blijvende last 4<span class="kolom-3"></span>'
    Q_4 = ?*(kN)', veranderlijke last 4<span class="kolom-3"></span>'
    a_4 = ?*(mm)', positie t.o.v. nulpunt<span class="kolom-3"></span>'
#end if
#if n_last ≥ 5
    G_5 = ?*(kN)', blijvende last 5<span class="kolom-3"></span>'
    Q_5 = ?*(kN)', veranderlijke last 5<span class="kolom-3"></span>'
    a_5 = ?*(mm)', positie t.o.v. nulpunt<span class="kolom-3"></span>'
#end if
#if n_last ≥ 6
    G_6 = ?*(kN)', blijvende last 6<span class="kolom-3"></span>'
    Q_6 = ?*(kN)', veranderlijke last 6<span class="kolom-3"></span>'
    a_6 = ?*(mm)', positie t.o.v. nulpunt<span class="kolom-3"></span>'
#end if
#if n_last ≥ 7
    G_7 = ?*(kN)', blijvende last 7<span class="kolom-3"></span>'
    Q_7 = ?*(kN)', veranderlijke last 7<span class="kolom-3"></span>'
    a_7 = ?*(mm)', positie t.o.v. nulpunt<span class="kolom-3"></span>'
#end if
#if n_last ≥ 8
    G_8 = ?*(kN)', blijvende last 8<span class="kolom-3"></span>'
    Q_8 = ?*(kN)', veranderlijke last 8<span class="kolom-3"></span>'
    a_8 = ?*(mm)', positie t.o.v. nulpunt<span class="kolom-3"></span>'
#end if
#if n_last ≥ 9
    G_9 = ?*(kN)', blijvende last 9<span class="kolom-3"></span>'
    Q_9 = ?*(kN)', veranderlijke last 9<span class="kolom-3"></span>'
    a_9 = ?*(mm)', positie t.o.v. nulpunt<span class="kolom-3"></span>'
#end if
#if n_last ≥ 10
    G_10 = ?*(kN)', blijvende last 10<span class="kolom-3"></span>'
    Q_10 = ?*(kN)', veranderlijke last 10<span class="kolom-3"></span>'
    a_10 = ?*(mm)', positie t.o.v. nulpunt<span class="kolom-3"></span>'
#end if
#if n_last ≥ 11
    G_11 = ?*(kN)', blijvende last 11<span class="kolom-3"></span>'
    Q_11 = ?*(kN)', veranderlijke last 11<span class="kolom-3"></span>'
    a_11 = ?*(mm)', positie t.o.v. nulpunt<span class="kolom-3"></span>'
#end if
#if n_last ≥ 12
    G_12 = ?*(kN)', blijvende last 12<span class="kolom-3"></span>'
    Q_12 = ?*(kN)', veranderlijke last 12<span class="kolom-3"></span>'
    a_12 = ?*(mm)', positie t.o.v. nulpunt<span class="kolom-3"></span>'
#end if

# 2. Combinatiefactoren

'<i>Vul de factoren in voor de situatie die je wilt onderzoeken. Het blad bepaalt geen toepasselijke normcombinatie of gunstige belasting.</i><span class="alleen-scherm"></span>
factor_GA = ?', combinatie A, blijvende lasten<span class="kolom-4"></span>'
factor_QA = ?', combinatie A, veranderlijke lasten<span class="kolom-4"></span>'
factor_GB = ?', combinatie B, blijvende lasten<span class="kolom-4"></span>'
factor_QB = ?', combinatie B, veranderlijke lasten<span class="kolom-4"></span>'

# 3. Resultanten en momenten

#hide
G_som = G_1 + G_2 + G_3 + G_4 + G_5 + G_6 + G_7 + G_8 + G_9 + G_10 + G_11 + G_12 to kN
Q_som = Q_1 + Q_2 + Q_3 + Q_4 + Q_5 + Q_6 + Q_7 + Q_8 + Q_9 + Q_10 + Q_11 + Q_12 to kN
M_G = G_1*(a_1 - a_lijn) + G_2*(a_2 - a_lijn) + G_3*(a_3 - a_lijn) + G_4*(a_4 - a_lijn) + G_5*(a_5 - a_lijn) + G_6*(a_6 - a_lijn) + G_7*(a_7 - a_lijn) + G_8*(a_8 - a_lijn) + G_9*(a_9 - a_lijn) + G_10*(a_10 - a_lijn) + G_11*(a_11 - a_lijn) + G_12*(a_12 - a_lijn) to kN*mm
M_Q = Q_1*(a_1 - a_lijn) + Q_2*(a_2 - a_lijn) + Q_3*(a_3 - a_lijn) + Q_4*(a_4 - a_lijn) + Q_5*(a_5 - a_lijn) + Q_6*(a_6 - a_lijn) + Q_7*(a_7 - a_lijn) + Q_8*(a_8 - a_lijn) + Q_9*(a_9 - a_lijn) + Q_10*(a_10 - a_lijn) + Q_11*(a_11 - a_lijn) + Q_12*(a_12 - a_lijn) to kN*mm
R_A = factor_GA*G_som + factor_QA*Q_som to kN
R_B = factor_GB*G_som + factor_QB*Q_som to kN
M_A = factor_GA*M_G + factor_QA*M_Q to kN*mm
M_B = factor_GB*M_G + factor_QB*M_Q to kN*mm
#show

G_som', som blijvende lasten'
Q_som', som veranderlijke lasten'
M_G', statisch moment blijvende lasten'
M_Q', statisch moment veranderlijke lasten'
R_A', resultante combinatie A'
M_A', moment van A rond de referentielijn'
R_B', resultante combinatie B'
M_B', moment van B rond de referentielijn'

#if abs(R_A) > 0.000001 kN
    a_A = a_lijn + M_A/R_A to mm', aangrijpingspunt combinatie A'
#else
    'Combinatie A heeft geen eenduidig aangrijpingspunt: resultante nul.
#end if
#if abs(R_B) > 0.000001 kN
    a_B = a_lijn + M_B/R_B to mm', aangrijpingspunt combinatie B'
#else
    'Combinatie B heeft geen eenduidig aangrijpingspunt: resultante nul.
#end if

'<i class="ook-afdruk">Dit blad geeft geen sterktetoets. Gebruik de uitkomsten als belastingsgegevens voor een afzonderlijke beoordeling.</i>
`;
