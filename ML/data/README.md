# EcoLens Data README

## Dataset Source
- **Dataset Name**: `THULab/air-quality`
- **Hugging Face URL**: https://huggingface.co/datasets/THULab/air-quality
- **License**: CC0-1.0 Public Domain
- **Original Source**: neuralsorcerer/air-quality (DOI: 10.57967/hf/5729)

## Dataset Characteristics
- **Total Records**: 87,672 hourly observations
- **Date Range**: 2015-01-01 00:00:00 to 2024-12-31 23:00:00 (~10 years)
- **Station Location**: Single station (Kolkata, West Bengal, India)
- **Frequency**: Continuous hourly timestamps (1-hour step)

## Schema / Variables
- `time`: Hourly timestamp (UTC+05:30 IST wall-clock)
- `pm25`: Particulate Matter < 2.5 µm (µg m⁻³) - Primary Target at t+6
- `pm10`: Particulate Matter < 10 µm (µg m⁻³)
- `no2`: Nitrogen Dioxide (µg m⁻³)
- `co`: Carbon Monoxide (mg m⁻³)
- `so2`: Sulphur Dioxide (µg m⁻³)
- `o3`: Surface Ozone (µg m⁻³)
- `temp`: Dry-bulb Air Temperature (°C)
- `rh`: Relative Humidity (%)
- `wind`: 10 m Wind Speed (m s⁻¹)
- `rain`: Hourly Precipitation (mm h⁻¹)
