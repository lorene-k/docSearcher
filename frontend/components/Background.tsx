import DotField from './DotField';

export default function Background() {
    return (
        <div style={{ width: '100%', height: '600px', position: 'relative' }}>
            <DotField
                dotRadius={1.5}
                dotSpacing={14}
                bulgeStrength={67}
                glowRadius={160}
                sparkle={false}
                waveAmplitude={0}
                cursorRadius={500}
                cursorForce={0.1}
                bulgeOnly
                gradientFrom="#A855F7"
                gradientTo="#B497CF"
                glowColor="#120F17"
            />
        </div>
    );
}