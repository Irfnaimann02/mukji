# Generates supabase/sql/033_ansan_restaurants_import.sql from the licence CSV (#48).
# Usage: pip install pyproj && python supabase/tools/ansan_import.py <licence.csv> supabase/sql/033_ansan_restaurants_import.sql
# The CSV is 행정안전부 식품_일반음식점 for 안산시 (cp949). It is not in the repo (10 MB).
import csv, io, sys, re, math, collections
from pyproj import Transformer
src, out = sys.argv[1], sys.argv[2]
rows = list(csv.DictReader(io.StringIO(open(src,'rb').read().decode('cp949'))))
t = Transformer.from_crs('EPSG:5174','EPSG:4326',always_xy=True)
SKIP = {'출장조리','푸드트럭'}
FOOD = {'호프/통닭':'chicken','통닭(치킨)':'chicken','까페':'cafe','라이브카페':'cafe','냉면집':'noodles',
        '한식':'korean','식육(숯불구이)':'korean','분식':'korean','김밥(도시락)':'korean','탕류(보신용)':'korean',
        '횟집':'korean','정종/대포집/소주방':'korean','복어취급':'korean'}
def q(s): return "'" + s.replace("'", "''") + "'"
def phone(p):
    d = re.sub(r'\D','',p or '')
    if not d: return ''
    if d.startswith('02') and len(d) in (9,10): return f"02-{d[2:-4]}-{d[-4:]}"
    if len(d) in (10,11) and d[0]=='0': return f"{d[:3]}-{d[3:-4]}-{d[-4:]}"
    if len(d)==8: return f"{d[:4]}-{d[4:]}"
    return d
def addr(r):
    a = (r['도로명주소'] or r['지번주소'] or '').strip()
    return re.sub(r'^경기도\s+','',re.sub(r'\s+',' ',a))
seen=set(); vals=[]; skipped=collections.Counter()
for r in rows:
    if not r['영업상태명'].startswith('영업'): continue
    if r['업태구분명'] in SKIP: skipped['no fixed place']+=1; continue
    try: x=float(r['좌표정보(X)']); y=float(r['좌표정보(Y)'])
    except: skipped['no coordinates']+=1; continue
    lng,lat = t.transform(x,y)
    if not (37.05<lat<37.45 and 126.3<lng<127.0): skipped['outside Ansan']+=1; continue
    lic=r['관리번호'].strip()
    if lic in seen: skipped['duplicate licence']+=1; continue
    seen.add(lic)
    name=re.sub(r'\s+',' ',r['사업장명']).strip()
    if not name: skipped['no name']+=1; continue
    cat=r['업태구분명'].strip() or None
    vals.append(f"({q('lic-'+lic)},{q(name)},{q(name)},{q(FOOD.get(cat,'other'))},{lat:.7f},{lng:.7f},{q(addr(r))},{q(phone(r['전화번호']))},{q(lic)},{q(cat) if cat else 'null'})")
CH=500
with open(out,'w',encoding='utf-8') as f:
    f.write(f"""-- 033_ansan_restaurants_import.sql
-- Part of #48. Every open licensed restaurant in 안산시 from public licence data
-- (행정안전부 식품_일반음식점, the same file as 028, 영업/정상 only): {len(vals)} restaurants.
-- Needs 032 first (bulk_import column).
--
-- What is stored: licence name (also used as the English name until we have one), food type
-- from 업태구분명, address, the business phone from the licence, licence number and map position
-- (converted from EPSG:5174 to WGS84, checked against 004's values). No owner names.
-- Skipped: {dict(skipped)}.
-- Restaurants we already have (same licence number) are left as they are.
-- These rows have no menu yet: the app shows the food-type hint (category_defaults) until a
-- chain menu, a template or a real menu is added.
-- Undo: delete from public.restaurants where bulk_import;  (dishes go with them)
-- Safe to re-run.

begin;
""")
    for i in range(0,len(vals),CH):
        f.write("\ninsert into public.restaurants\n  (id, name_ko, name_en, food_type, lat, lng, address, phone, public_data_id, category)\nvalues\n  ")
        f.write(",\n  ".join(vals[i:i+CH]))
        f.write("\non conflict do nothing;\n")
    f.write("""
-- A second licence for a restaurant we already have (e.g. 남월 한양대점 next to r10 남월 쌀국수):
-- within about 30 m and the names start the same, like the app's samePlace(). Keep ours only.
delete from public.restaurants as imp
using public.restaurants as own
where imp.id like 'lic-%'
  and not own.id like 'lic-%'
  and abs(imp.lat - own.lat) < 0.0003
  and abs(imp.lng - own.lng) < 0.0004
  and left(imp.name_ko, 2) = left(own.name_ko, 2);

-- Shared settings for every imported row.
update public.restaurants
set bulk_import = true, status = 'approved', location_source = 'public_data'
where id like 'lic-%' and not bulk_import;

commit;

-- Check:
-- select count(*) filter (where bulk_import) as imported, count(*) as total from public.restaurants;
""")
print(len(vals), dict(skipped))
