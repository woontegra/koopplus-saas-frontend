import {
  getTurkeyDistricts,
  resolveTurkeyDistrict,
  resolveTurkeyProvince,
  TURKEY_PROVINCES
} from '../../data/turkeyLocations'

interface CityDistrictFieldsProps {
  city: string
  district: string
  onChange: (city: string, district: string) => void
  cityGroupClassName?: string
  districtGroupClassName?: string
}

function uniqueOptions(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const trimmed = value?.trim()
    if (!trimmed) continue
    const key = trimmed.toLocaleLowerCase('tr-TR')
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

export default function CityDistrictFields({
  city,
  district,
  onChange,
  cityGroupClassName = 'form-group',
  districtGroupClassName = 'form-group'
}: CityDistrictFieldsProps): JSX.Element {
  const knownProvince = resolveTurkeyProvince(city)
  const cityValue = knownProvince ?? city.trim()
  const cityOptions = uniqueOptions([cityValue, ...TURKEY_PROVINCES])

  const knownDistricts = getTurkeyDistricts(city)
  const knownDistrict = resolveTurkeyDistrict(city, district)
  const districtValue = knownDistrict ?? district.trim()
  const districtOptions = uniqueOptions([districtValue, ...knownDistricts])
  const hasCity = Boolean(city.trim())

  return (
    <>
      <div className={cityGroupClassName}>
        <label>İl</label>
        <select
          value={cityValue}
          onChange={(event) => {
            const nextCity = event.target.value
            onChange(nextCity, '')
          }}
        >
          <option value="">İl seçiniz</option>
          {cityOptions.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
      </div>
      <div className={districtGroupClassName}>
        <label>İlçe</label>
        <select
          value={hasCity ? districtValue : ''}
          disabled={!hasCity}
          onChange={(event) => onChange(cityValue, event.target.value)}
        >
          <option value="">{hasCity ? 'İlçe seçiniz' : 'Önce il seçiniz'}</option>
          {hasCity &&
            districtOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
        </select>
      </div>
    </>
  )
}
