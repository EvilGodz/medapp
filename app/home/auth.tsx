import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from "expo-linear-gradient";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const {width} = Dimensions.get("window");



export default function AuthScreen() {
    const [hasBiometrics, setHasbiometrics] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const token = await AsyncStorage.getItem('token');
            const user = await AsyncStorage.getItem('user');
            if (!token || !user) {
                router.replace('/login/LoginScreen');
            }
        };
        checkAuth();
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setHasbiometrics(hasHardware && isEnrolled);
    }

    const authenticate = async () => {
        try {
            setIsAuthenticating(true);
            setError(null);

            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync;

            //local auth
            const auth = await LocalAuthentication.authenticateAsync({
                promptMessage: hasHardware && isEnrolled ? 'Use Biometric':'Enter Your PIN',
                fallbackLabel: 'Use Pin',
                cancelLabel: 'Cancel',
                disableDeviceFallback: false,
            });
            if(auth.success){
                router.replace("/home/home");
            }else{
                setError('Authentication Failed: Please Try again');
                setIsAuthenticating(false);
            }

        }
        catch (error){

        };
    }
    return (
        <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={style.containter}>
            <View style={style.content}>
                <View style={style.iconContainter}>
                    <Ionicons name="medkit" size={80} color="white" />
                </View>
                <Text style={style.title}>MeCoRe</Text>
                <Text style={style.subtitle}>A Medicinal Consumption Reminder Application</Text>

                <View style={style.card}>
                    <Text style={style.welcomeText}>Welcome Back!</Text>
                    <Text style={style.instructionText}>
                        {hasBiometrics ? 'กรุณายืนยันตัวตนเพื่อเข้าสู่แอปพลิเคชัน'
                        : 'กรุณาใส่รหัสเพื่อเข้าสู่แอปพลิเคชัน'}
                    </Text>

                    <TouchableOpacity style={[style.button, isAuthenticating && style.buttonDisable]}
                    onPress={authenticate}
                    disabled={isAuthenticating}
                    >
                        <Ionicons name={hasBiometrics ? "finger-print-outline":"keypad-outline"}
                        size={24}
                        color='white'
                        style={style.buttonIcon}/>

                            <Text style={style.buttonText}>
                                {isAuthenticating 
                                ? "Verifying..."
                                : hasBiometrics 
                                ? "Authenticate"
                                : "Enter PIN" }
                            </Text>
                    </TouchableOpacity>

                    {error && (
                        <View style={style.errorContainer}>
                        <Ionicons name="alert-circle" size={20} color={"#f44336"}/>
                        <Text style={style.errorText}>{error}</Text>
                        </View>)}
                </View>
            </View>
        </LinearGradient>
    )
}

const style = StyleSheet.create({
    containter:{
        flex: 1,
    },
    content:{
        flex: 1,
        padding: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    iconContainter:{
        width:120,
        height:120,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius:60,
        justifyContent:'center',
        alignItems:'center',
        marginBottom:20,
    },
    title:{
        fontSize:24,
        fontWeight:'bold',
        color:"white",
        marginBottom:10,
        textShadowColor: "rgba(0,0,0,0.2)",
        textShadowOffset: {width:1,height:1},
        textShadowRadius: 3,
    },
    subtitle:{
        fontSize:18,
        color:"rgba(255,255,255,0.9)",
        marginBottom:40,
        textAlign:'center',
    },
    card:{
        backgroundColor:'white',
        borderRadius:20,
        padding:20,
        width: width - 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset:{
            width:0,
            height:2
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
    },
    welcomeText:{
        fontSize:20,
        fontWeight:'bold',
        color:'#333',
        marginBottom:10
    },
    instructionText:{
        fontSize:16,
        textAlign:'center',
        color:'#666',
        marginBottom:30
    },
    button:{
        backgroundColor: "#4CAF50",
        borderRadius:12,
        paddingVertical:15,
        paddingHorizontal:30,
        width:'100%',
        alignItems:'center',
        justifyContent:'center',
        flexDirection:'row'
    },
    buttonDisable:{
        opacity: 0.7,
    },
    buttonIcon:{
        marginRight:10,
    },
    buttonText:{
        color:'white',
        fontSize:16,
        fontWeight:'600'
    },
    errorContainer:{
        flexDirection:'row',
        alignItems:'center',
        marginTop:20,
        padding:10,
        backgroundColor:'#ffebee',
        borderRadius:8
    },
    errorText:{
        color:'#f44336',
        fontSize:14,
        marginLeft:8
    }
})